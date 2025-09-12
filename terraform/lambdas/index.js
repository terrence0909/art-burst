const { v4: uuidv4 } = require("uuid");
const AWS = require("aws-sdk");

const s3 = new AWS.S3({ region: "us-east-1" });
const dynamo = new AWS.DynamoDB.DocumentClient({ region: "us-east-1" });

const TABLE_NAME = process.env.TABLE_NAME;
const BIDS_TABLE_NAME = process.env.BIDS_TABLE_NAME;
const BUCKET_NAME = process.env.BUCKET_NAME;
const ARTISTS_TABLE_NAME = "artburst-artists";

exports.handler = async (event) => {
  console.log("Incoming event:", JSON.stringify(event, null, 2));
  console.log("Environment:", { TABLE_NAME, BIDS_TABLE_NAME, BUCKET_NAME });

  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 200,
      headers: corsHeaders(),
      body: JSON.stringify({ message: "CORS preflight successful" }),
    };
  }

  try {
    let body;
    try {
      body = event.body ? JSON.parse(event.body) : {};
      console.log("Parsed request body:", JSON.stringify(body, null, 2));
    } catch (parseError) {
      console.error("Failed to parse request body:", parseError);
      return {
        statusCode: 400,
        headers: corsHeaders(),
        body: JSON.stringify({ message: "Invalid JSON in request body" }),
      };
    }

    // ---- CREATE AUCTION ----
    if (event.httpMethod === "POST" && event.path === "/auctions") {
      console.log("=== CREATE AUCTION ===");
      const auctionId = uuidv4();
      const artistName = body.artistName || body.artist || "Unknown Artist";

      const auctionWithId = {
        ...body,
        artistName,
        artist: artistName,
        auctionId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        currentBid: body.startingBid || 0,
        highestBidder: null,
        bidCount: 0,
      };

      delete auctionWithId.artistId;

      console.log("Saving to DynamoDB:", JSON.stringify(auctionWithId, null, 2));

      await dynamo.put({
        TableName: TABLE_NAME,
        Item: auctionWithId,
      }).promise();

      return {
        statusCode: 200,
        headers: corsHeaders(),
        body: JSON.stringify({
          message: "Auction created successfully",
          auctionId,
          auction: auctionWithId,
        }),
      };
    }

    // ---- PLACE BID ----
    if (event.httpMethod === "POST" && event.path === "/auctions/bid") {
      console.log("=== BID PLACEMENT STARTED ===");

      const { auctionId, bidAmount, bidderId } = body;

      if (!auctionId || !bidAmount || !bidderId) {
        return {
          statusCode: 400,
          headers: corsHeaders(),
          body: JSON.stringify({
            message: "Missing required fields: auctionId, bidAmount, bidderId",
          }),
        };
      }

      try {
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
        const currentHighestBid = auction.currentBid || auction.startingBid || 0;

        if (bidAmount <= currentHighestBid) {
          return {
            statusCode: 400,
            headers: corsHeaders(),
            body: JSON.stringify({
              message: `Bid must be higher than current bid of R${currentHighestBid}`,
            }),
          };
        }

        const bidId = uuidv4();
        const bidItem = {
          bidId,
          auctionId,
          bidAmount,
          bidderId,
          bidTime: new Date().toISOString(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          itemType: "bid",
        };

        // Save the bid to the bids table
        await dynamo.put({
          TableName: BIDS_TABLE_NAME,
          Item: bidItem,
        }).promise();

        // Update auction with new bid
        const updateResult = await dynamo.update({
          TableName: TABLE_NAME,
          Key: { auctionId },
          UpdateExpression:
            "SET currentBid = :bid, highestBidder = :bidder, updatedAt = :now ADD bidCount :inc",
          ExpressionAttributeValues: {
            ":bid": bidAmount,
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
    }

    // ---- FETCH ALL AUCTIONS ----
    if (event.httpMethod === "GET" && event.path === "/auctions") {
      try {
        const result = await dynamo.scan({ TableName: TABLE_NAME }).promise();
        const auctions = (result.Items || []).filter((item) => !item.itemType);
        const processed = await Promise.all(
          auctions.map(async (auction) => await fixAuctionArtistName(auction))
        );

        // Generate presigned URLs
        const auctionsWithUrls = await Promise.all(
          processed.map(async (auction) => {
            if (auction.images && auction.images.length > 0) {
              const urls = await Promise.all(
                auction.images.map(async (imageEntry) => {
                  let key = imageEntry.split("amazonaws.com/")[1] || imageEntry;
                  key = decodeURIComponent(key.split("?")[0]);
                  if (!key.startsWith("public/")) key = "public/" + key;
                  return s3.getSignedUrl("getObject", { Bucket: BUCKET_NAME, Key: key, Expires: 3600 });
                })
              );
              auction.images = urls.filter(Boolean);
              auction.image = auction.images[0] || null;
            }
            return auction;
          })
        );

        return { statusCode: 200, headers: corsHeaders(), body: JSON.stringify(auctionsWithUrls) };
      } catch (error) {
        return { statusCode: 500, headers: corsHeaders(), body: JSON.stringify({ message: "Failed to fetch auctions", error: error.message }) };
      }
    }

    // ---- FETCH AUCTION BY ID ----
    if (event.httpMethod === "GET" && event.pathParameters && event.pathParameters.id) {
      try {
        const auctionId = event.pathParameters.id;
        const result = await dynamo.get({ TableName: TABLE_NAME, Key: { auctionId } }).promise();
        if (!result.Item) return { statusCode: 404, headers: corsHeaders(), body: JSON.stringify({ message: "Auction not found" }) };

        let auction = await fixAuctionArtistName(result.Item);

        if (auction.images && auction.images.length > 0) {
          const urls = await Promise.all(
            auction.images.map(async (imageEntry) => {
              let key = imageEntry.split("amazonaws.com/")[1] || imageEntry;
              key = decodeURIComponent(key.split("?")[0]);
              if (!key.startsWith("public/")) key = "public/" + key;
              return s3.getSignedUrl("getObject", { Bucket: BUCKET_NAME, Key: key, Expires: 3600 });
            })
          );
          auction.images = urls.filter(Boolean);
          auction.image = auction.images[0] || null;
        }

        return { statusCode: 200, headers: corsHeaders(), body: JSON.stringify(auction) };
      } catch (error) {
        return { statusCode: 500, headers: corsHeaders(), body: JSON.stringify({ message: "Failed to fetch auction", error: error.message }) };
      }
    }

    // ---- FETCH BIDS BY USER ----
    if (event.httpMethod === "GET" && event.path === "/my-bids") {
      const userId = event.queryStringParameters?.userId;
      if (!userId) {
        return {
          statusCode: 400,
          headers: corsHeaders(),
          body: JSON.stringify({ message: "Missing required query parameter: userId" }),
        };
      }

      try {
        const params = {
          TableName: BIDS_TABLE_NAME,
          IndexName: "userId-index",
          KeyConditionExpression: "userId = :uid",
          ExpressionAttributeValues: {
            ":uid": userId,
          },
        };

        const result = await dynamo.query(params).promise();

        return {
          statusCode: 200,
          headers: corsHeaders(),
          body: JSON.stringify(result.Items),
        };
      } catch (error) {
        console.error("Error fetching user bids:", error);
        return {
          statusCode: 500,
          headers: corsHeaders(),
          body: JSON.stringify({ message: "Failed to fetch user bids", error: error.message }),
        };
      }
    }

    return { statusCode: 404, headers: corsHeaders(), body: JSON.stringify({ message: "Endpoint not found" }) };
  } catch (error) {
    return { statusCode: 500, headers: corsHeaders(), body: JSON.stringify({ message: "Internal Server Error", error: error.message }) };
  }
};

async function fixAuctionArtistName(auction) {
  if (auction.artist && isUUID(auction.artist)) {
    try {
      const artistResult = await dynamo.get({ TableName: ARTISTS_TABLE_NAME, Key: { artistId: auction.artist } }).promise();
      if (artistResult.Item) {
        auction.artist = artistResult.Item.username || "Unknown Artist";
        auction.artistName = auction.artist;
      } else {
        auction.artist = auction.artistName = "Unknown Artist";
      }
    } catch (error) {
      auction.artist = auction.artistName = "Unknown Artist";
    }
  } else if (auction.artistName) {
    auction.artist = auction.artistName;
  } else if (auction.artist) {
    auction.artistName = auction.artist;
  } else {
    auction.artist = auction.artistName = "Unknown Artist";
  }
  return auction;
}

function isUUID(str) {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
}

function corsHeaders() {
  return {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS, PUT, DELETE",
    "Access-Control-Allow-Credentials": true,
  };
}
