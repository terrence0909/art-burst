const { DynamoDBClient, QueryCommand, DeleteItemCommand, BatchWriteItemCommand } = require("@aws-sdk/client-dynamodb");
const { ApiGatewayManagementApiClient, PostToConnectionCommand } = require("@aws-sdk/client-apigatewaymanagementapi");
const { unmarshall } = require("@aws-sdk/util-dynamodb");

const dynamo = new DynamoDBClient({ region: "us-east-1" });
const apiGatewayClient = new ApiGatewayManagementApiClient({
  region: "us-east-1",
  endpoint: "https://qm968tbs12.execute-api.us-east-1.amazonaws.com/prod"
});

exports.handler = async (event) => {
  const { auctionId, bidData, action = "bidUpdate" } = event;
  
  try {
    console.log("Broadcasting to subscribers of auction:", auctionId);
    
    // 1. Get subscribers to THIS specific auction
    const specificSubscribers = await dynamo.send(new QueryCommand({
      TableName: "WebSocketConnections",
      IndexName: "auctionId-index",
      KeyConditionExpression: "auctionId = :auctionId",
      ExpressionAttributeValues: {
        ":auctionId": { S: auctionId }
      }
    }));

    // 2. Get wildcard subscribers (those subscribed to ALL auctions)
    const wildcardSubscribers = await dynamo.send(new QueryCommand({
      TableName: "WebSocketConnections",
      IndexName: "auctionId-index", 
      KeyConditionExpression: "auctionId = :wildcard",
      ExpressionAttributeValues: {
        ":wildcard": { S: "*" } // Wildcard subscription
      }
    }));

    // Combine both sets of subscribers
    const allSubscribers = [
      ...(specificSubscribers.Items || []),
      ...(wildcardSubscribers.Items || [])
    ];

    console.log(`Found ${allSubscribers.length} subscribers (${specificSubscribers.Items?.length || 0} specific + ${wildcardSubscribers.Items?.length || 0} wildcard)`);

    // Arrays to track stale connections for batch deletion
    const staleConnections = [];
    const sendPromises = [];

    // Process connections in parallel with better error handling
    for (const item of allSubscribers) {
      const connection = unmarshall(item);
      const connectionId = connection.connectionId;
      
      if (!connectionId) continue;
      
      // Send message with proper error handling
      const sendPromise = apiGatewayClient.send(new PostToConnectionCommand({
        ConnectionId: connectionId,
        Data: JSON.stringify({
          action: action,
          auctionId: auctionId,
          bid: bidData,
          timestamp: new Date().toISOString()
        })
      }))
      .then(() => {
        console.log("✅ Sent update to connection:", connectionId);
      })
      .catch(error => {
        // Remove stale connections (status 410 = Gone)
        if (error.statusCode === 410 || error.name === 'GoneException') {
          console.log("🗑️ Stale connection found:", connectionId);
          staleConnections.push({
            DeleteRequest: {
              Key: { connectionId: { S: connectionId } }
            }
          });
        } else {
          console.error("Error sending to connection", connectionId, error);
        }
      });
      
      sendPromises.push(sendPromise);
    }

    // Wait for all messages to be sent
    await Promise.all(sendPromises);

    // Batch delete stale connections (max 25 per batch)
    if (staleConnections.length > 0) {
      console.log(`🧹 Removing ${staleConnections.length} stale connections`);
      
      // Process in batches of 25 (DynamoDB limit)
      for (let i = 0; i < staleConnections.length; i += 25) {
        const batch = staleConnections.slice(i, i + 25);
        await dynamo.send(new BatchWriteItemCommand({
          RequestItems: {
            "WebSocketConnections": batch
          }
        }));
        console.log(`✅ Removed batch of ${batch.length} stale connections`);
      }
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ 
        message: "Broadcast successful",
        subscribers: allSubscribers.length,
        staleConnectionsRemoved: staleConnections.length
      })
    };
  } catch (error) {
    console.error("Broadcast error:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        error: "Broadcast failed",
        details: error.message 
      })
    };
  }
};