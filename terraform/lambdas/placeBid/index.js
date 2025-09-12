const AWS = require("aws-sdk");
const { v4: uuidv4 } = require("uuid");

const dynamo = new AWS.DynamoDB.DocumentClient({ region: "us-east-1" });

const TABLE_NAME = process.env.TABLE_NAME;       // Auctions table
const BIDS_TABLE_NAME = process.env.BIDS_TABLE_NAME; // Bids table

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
      userId: bidderId,       // Save userId for dashboard queries
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

    return {
      statusCode: 200,
      headers: corsHeaders(),
      body: JSON.stringify({
        message: "Bid placed successfully",
        bid: bidItem,
        auction: updateResult.Attributes,
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
