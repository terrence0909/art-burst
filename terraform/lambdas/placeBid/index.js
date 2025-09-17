const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, GetCommand, PutCommand, UpdateCommand, QueryCommand, DeleteCommand } = require("@aws-sdk/lib-dynamodb");
const { ApiGatewayManagementApiClient, PostToConnectionCommand } = require("@aws-sdk/client-apigatewaymanagementapi");

const client = new DynamoDBClient({ region: "us-east-1" });
const dynamo = DynamoDBDocumentClient.from(client);

let apiGatewayClient;

const TABLE_NAME = process.env.TABLE_NAME;           // Auctions table
const BIDS_TABLE_NAME = process.env.BIDS_TABLE_NAME; // Bids table
const CONNECTIONS_TABLE = process.env.CONNECTIONS_TABLE; // WebSocket connections table

// Simple random ID generator
function generateId() {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

exports.handler = async (event) => {
  console.log("Raw event received:", JSON.stringify(event, null, 2));

  // Initialize API Gateway client with WebSocket endpoint
  if (!apiGatewayClient && process.env.WEBSOCKET_ENDPOINT) {
    apiGatewayClient = new ApiGatewayManagementApiClient({
      region: "us-east-1",
      endpoint: process.env.WEBSOCKET_ENDPOINT
    });
    console.log("Initialized API Gateway WebSocket client with endpoint:", process.env.WEBSOCKET_ENDPOINT);
  }

  let body;
  try {
    if (event.requestContext && event.requestContext.routeKey) {
      // WebSocket event - parse the body string
      const rawBody = event.body || '{}';
      body = JSON.parse(rawBody);
      console.log("WebSocket event body:", JSON.stringify(body, null, 2));
    } else if (event.body) {
      // REST API event - body is already a string that needs parsing
      body = JSON.parse(event.body);
      console.log("REST API event body:", JSON.stringify(body, null, 2));
    } else {
      // Direct invocation or other format
      body = event;
      console.log("Direct invocation body:", JSON.stringify(body, null, 2));
    }
  } catch (parseError) {
    console.error("JSON parse error:", parseError);
    return {
      statusCode: 400,
      body: JSON.stringify({ message: "Invalid JSON in request body" }),
    };
  }

  const { action, auctionId, bidAmount, bidderId } = body;

  if (!auctionId || !bidAmount || !bidderId) {
    console.error("Missing required fields:", { auctionId, bidAmount, bidderId });
    return {
      statusCode: 400,
      body: JSON.stringify({ message: "Missing required fields: auctionId, bidAmount, bidderId" }),
    };
  }

  try {
    // Fetch auction
    const auctionResult = await dynamo.send(new GetCommand({
      TableName: TABLE_NAME,
      Key: { auctionId },
    }));

    if (!auctionResult.Item) {
      console.warn("Auction not found:", auctionId);
      return {
        statusCode: 404,
        body: JSON.stringify({ message: "Auction not found" }),
      };
    }

    const auction = auctionResult.Item;
    const currentHighestBid = Number(auction.currentBid || auction.startingBid || 0);
    const numericBid = Number(bidAmount);

    if (numericBid <= currentHighestBid) {
      console.log(`Bid too low: ${numericBid} <= ${currentHighestBid}`);
      return {
        statusCode: 400,
        body: JSON.stringify({ message: `Bid must be higher than current bid of R${currentHighestBid}` }),
      };
    }

    // Create bid item
    const bidId = generateId();
    const bidItem = {
      bidId,
      auctionId,
      bidAmount: numericBid,
      userId: bidderId,
      bidTime: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      itemType: "bid",
    };

    // Save bid to bids table
    await dynamo.send(new PutCommand({ TableName: BIDS_TABLE_NAME, Item: bidItem }));
    console.log("Bid saved:", bidItem);

    // Ensure bidCount exists
    const bidCount = auction.bidCount ? Number(auction.bidCount) : 0;

    // Update auction with new highest bid
    const updateResult = await dynamo.send(new UpdateCommand({
      TableName: TABLE_NAME,
      Key: { auctionId },
      UpdateExpression: "SET currentBid = :bid, highestBidder = :bidder, updatedAt = :now ADD bidCount :inc",
      ExpressionAttributeValues: {
        ":bid": numericBid,
        ":bidder": bidderId,
        ":now": new Date().toISOString(),
        ":inc": 1,
      },
      ReturnValues: "ALL_NEW",
    }));

    const updatedAuction = updateResult.Attributes;
    console.log("Auction updated:", updatedAuction);

    // Broadcast to WebSocket clients
    await broadcastBidUpdate(auctionId, bidItem, updatedAuction);

    return {
      statusCode: 200,
      body: JSON.stringify({ message: "Bid placed successfully", bid: bidItem, auction: updatedAuction }),
    };

  } catch (error) {
    console.error("Error placing bid:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: "Failed to place bid", error: error.message }),
    };
  }
};

async function broadcastBidUpdate(auctionId, bid, auction) {
  try {
    console.log(`Broadcasting bid update for auction: ${auctionId}`);

    if (!apiGatewayClient) {
      console.error("API Gateway client not initialized");
      return;
    }

    // Query connections from GSI
    const queryResult = await dynamo.send(new QueryCommand({
      TableName: CONNECTIONS_TABLE,
      IndexName: "auctionId-index",
      KeyConditionExpression: "auctionId = :auctionId",
      ExpressionAttributeValues: { ":auctionId": auctionId }
    }));

    const connections = queryResult.Items || [];
    console.log(`Found ${connections.length} connections for auction ${auctionId}`);

    if (connections.length === 0) return;

    const broadcastPromises = connections.map(async (connection) => {
      try {
        await apiGatewayClient.send(new PostToConnectionCommand({
          ConnectionId: connection.connectionId,
          Data: JSON.stringify({
            type: "NEW_BID",
            auctionId,
            bid: {
              bidAmount: bid.bidAmount,
              userId: bid.userId,
              bidTime: bid.bidTime,
              bidId: bid.bidId
            },
            auction: {
              currentBid: auction.currentBid,
              highestBidder: auction.highestBidder,
              bidCount: auction.bidCount,
              title: auction.title,
              artistName: auction.artistName
            },
            timestamp: new Date().toISOString()
          })
        }));
        console.log(`Sent update to connection: ${connection.connectionId}`);
        return { success: true, connectionId: connection.connectionId };
      } catch (error) {
        console.error(`Failed to send to connection ${connection.connectionId}:`, error);
        if (error.statusCode === 410 || error.name === 'GoneException') {
          await dynamo.send(new DeleteCommand({ TableName: CONNECTIONS_TABLE, Key: { connectionId: connection.connectionId } }));
          console.log(`Removed stale connection: ${connection.connectionId}`);
        }
        return { success: false, connectionId: connection.connectionId, error: error.message };
      }
    });

    const results = await Promise.all(broadcastPromises);
    console.log(`Broadcast complete: ${results.filter(r => r.success).length} successful, ${results.filter(r => !r.success).length} failed`);

  } catch (error) {
    console.error("Error in broadcastBidUpdate:", error);
  }
}