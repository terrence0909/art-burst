const AWS = require("aws-sdk");
const { v4: uuidv4 } = require("uuid");
const { CacheClient, Configurations, CredentialProvider } = require("@gomomento/sdk");

const dynamo = new AWS.DynamoDB.DocumentClient({ region: "us-east-1" });

const TABLE_NAME = process.env.TABLE_NAME;       // Auctions table
const BIDS_TABLE_NAME = process.env.BIDS_TABLE_NAME; // Bids table

// Momento configuration
const MOMENTO_AUTH_TOKEN = process.env.MOMENTO_AUTH_TOKEN;
const MOMENTO_CACHE_NAME = process.env.MOMENTO_CACHE_NAME || "live-bids-cache";
const MOMENTO_TTL_SECONDS = 3600; // 1 hour TTL

// Initialize Momento client
let momentoClient;
try {
  momentoClient = new CacheClient({
    configuration: Configurations.Lambda.latest(),
    credentialProvider: CredentialProvider.fromString({ authToken: MOMENTO_AUTH_TOKEN }),
    defaultTtlSeconds: MOMENTO_TTL_SECONDS
  });
} catch (error) {
  console.error("Error initializing Momento client:", error);
}

exports.handler = async (event) => {
  console.log("Incoming event:", JSON.stringify(event, null, 2));

  // Parse event body
  let body;
  try {
    body = event.body ? JSON.parse(event.body) : event;
  } catch (parseError) {
    return {
      statusCode: 400,
      headers: corsHeaders(),
      body: JSON.stringify({ message: "Invalid JSON in request body" }),
    };
  }

  const { auctionId, bidAmount, bidderId } = body;
  if (!auctionId || !bidAmount || !bidderId) {
    return {
      statusCode: 400,
      headers: corsHeaders(),
      body: JSON.stringify({ message: "Missing required fields: auctionId, bidAmount, bidderId" }),
    };
  }

  try {
    // Fetch the auction
    const auctionResult = await dynamo.get({
      TableName: TABLE_NAME,
      Key: { auctionId },
    }).promise();

    if (!auctionResult.Item) {
      return {
        statusCode: 404,
        headers: corsHeaders(),
        body: JSON.stringify({ message: "Auction not found" }),
      };
    }

    const auction = auctionResult.Item;
    const currentHighestBid = Number(auction.currentBid || auction.startingBid || 0);
    const numericBid = Number(bidAmount);

    if (numericBid <= currentHighestBid) {
      return {
        statusCode: 400,
        headers: corsHeaders(),
        body: JSON.stringify({
          message: `Bid must be higher than current bid of R${currentHighestBid}`,
        }),
      };
    }

    // Create bid item
    const bidId = uuidv4();
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
    await dynamo.put({
      TableName: BIDS_TABLE_NAME,
      Item: bidItem,
    }).promise();

    // Update auction with new highest bid
    const updateResult = await dynamo.update({
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
    }).promise();

    const updatedAuction = updateResult.Attributes;

    // Publish bid update to Momento for real-time notifications
    if (momentoClient) {
      try {
        const channelName = `auction-${auctionId}`;
        const messageData = {
          type: "NEW_BID",
          auctionId,
          bid: bidItem,
          auction: updatedAuction,
          timestamp: new Date().toISOString()
        };

        await momentoClient.publish(MOMENTO_CACHE_NAME, channelName, JSON.stringify(messageData));
        console.log("Published bid update to Momento channel:", channelName);
        
        // Also cache the latest auction state for quick retrieval
        await momentoClient.set(
          MOMENTO_CACHE_NAME, 
          `auction-${auctionId}-latest`, 
          JSON.stringify(updatedAuction)
        );
        
      } catch (momentoError) {
        console.error("Error publishing to Momento:", momentoError);
        // Don't fail the request if Momento fails
      }
    }

    return {
      statusCode: 200,
      headers: corsHeaders(),
      body: JSON.stringify({
        message: "Bid placed successfully",
        bid: bidItem,
        auction: updatedAuction,
      }),
    };
  } catch (error) {
    console.error("Error placing bid:", error);
    return {
      statusCode: 500,
      headers: corsHeaders(),
      body: JSON.stringify({ message: "Failed to place bid", error: error.message }),
    };
  }
};

// Standard CORS headers
function corsHeaders() {
  return {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS, PUT, DELETE",
    "Access-Control-Allow-Credentials": true,
  };
}