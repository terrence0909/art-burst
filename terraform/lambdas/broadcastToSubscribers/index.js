const { DynamoDBClient, QueryCommand, DeleteItemCommand } = require("@aws-sdk/client-dynamodb");
const { ApiGatewayManagementApiClient, PostToConnectionCommand } = require("@aws-sdk/client-apigatewaymanagementapi");

const dynamo = new DynamoDBClient({ region: "us-east-1" });
const apiGatewayClient = new ApiGatewayManagementApiClient({
  region: "us-east-1",
  endpoint: "https://qm968tbs12.execute-api.us-east-1.amazonaws.com/prod"
});

exports.handler = async (event) => {
  const { auctionId, bidData, action = "bidUpdate" } = event;
  
  try {
    console.log("Broadcasting to subscribers of auction:", auctionId);
    
    // ✅ USE QUERY WITH GSI INSTEAD OF SCAN
    const connections = await dynamo.send(new QueryCommand({
      TableName: process.env.CONNECTIONS_TABLE,
      IndexName: "auctionId-index",  // Use the GSI
      KeyConditionExpression: "auctionId = :auctionId",
      ExpressionAttributeValues: {
        ":auctionId": { S: auctionId }
      }
    }));

    console.log(`Found ${connections.Items?.length || 0} subscribers for auction ${auctionId}`);

    // Send update to each connection
    for (const connection of connections.Items || []) {
      const connectionId = connection.connectionId?.S;
      if (!connectionId) continue;
      
      try {
        await apiGatewayClient.send(new PostToConnectionCommand({
          ConnectionId: connectionId,
          Data: JSON.stringify({
            action: action,
            auctionId: auctionId,
            bid: bidData,
            timestamp: new Date().toISOString()
          })
        }));
        console.log("✅ Sent update to connection:", connectionId);
      } catch (error) {
        // Remove stale connections (status 410 = Gone)
        if (error.statusCode === 410) {
          await dynamo.send(new DeleteItemCommand({
            TableName: process.env.CONNECTIONS_TABLE,
            Key: { connectionId: { S: connectionId } }
          }));
          console.log("🗑️ Removed stale connection:", connectionId);
        } else {
          console.error("Error sending to connection", connectionId, error);
        }
      }
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ 
        message: "Broadcast successful",
        subscribers: connections.Items?.length || 0
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