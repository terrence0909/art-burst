// lambdas/index.js - FULL UPDATED VERSION WITH CORRECT ARTIST RESOLUTION
const { v4: uuidv4 } = require("uuid");
const AWS = require("aws-sdk");

const s3 = new AWS.S3({ region: "us-east-1" });
const dynamo = new AWS.DynamoDB.DocumentClient({ region: "us-east-1" });

const TABLE_NAME = process.env.TABLE_NAME;
const BUCKET_NAME = process.env.BUCKET_NAME;
const ARTISTS_TABLE_NAME = "artburst-artists"; // ✅ Correct table name

exports.handler = async (event) => {
  console.log("Incoming event:", JSON.stringify(event, null, 2));
  console.log("Environment:", { TABLE_NAME, BUCKET_NAME });

  // Handle preflight OPTIONS request for CORS
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 200,
      headers: corsHeaders(),
      body: JSON.stringify({ message: "CORS preflight successful" }),
    };
  }

  try {
    // Parse request body
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
      const auctionId = uuidv4();

      // ✅ Get the actual artist name, not the ID
      const artistName = body.artistName || body.artist || "Unknown Artist";

      const auctionWithId = {
        ...body,
        artistName,       // ✅ Store the name
        artist: artistName, // ✅ Store the name here too, not the UUID
        id: auctionId,
        auctionId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // Remove any UUID fields to avoid confusion
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
          id: auctionId,
          auctionId,
          auction: auctionWithId,
        }),
      };
    }

    // ---- PLACE BID ----
    if (event.httpMethod === "POST" && event.path === "/auctions/bid") {
      console.log("Placing bid");

      if (!body.auctionId || !body.bidAmount || !body.bidderId) {
        return {
          statusCode: 400,
          headers: corsHeaders(),
          body: JSON.stringify({ message: "Missing required fields: auctionId, bidAmount, bidderId" }),
        };
      }

      const { auctionId, bidAmount, bidderId } = body;

      try {
        const auctionResult = await dynamo.get({
          TableName: TABLE_NAME,
          Key: { auctionId: auctionId }
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
              message: `Bid must be higher than current bid of R${currentHighestBid}` 
            }),
          };
        }

        const bidId = uuidv4();
        const bidItem = {
          id: `bid#${bidId}`,
          auctionId,
          bidAmount,
          bidderId,
          bidTime: new Date().toISOString(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          itemType: "bid"
        };

        await dynamo.update({
          TableName: TABLE_NAME,
          Key: { auctionId: auctionId },
          UpdateExpression: 'SET currentBid = :bid, highestBidder = :bidder, updatedAt = :now ADD bidCount :inc',
          ExpressionAttributeValues: {
            ':bid': bidAmount,
            ':bidder': bidderId,
            ':inc': 1,
            ':now': new Date().toISOString()
          },
          ConditionExpression: 'attribute_exists(auctionId)'
        }).promise();

        await dynamo.put({
          TableName: TABLE_NAME,
          Item: bidItem
        }).promise();

        return {
          statusCode: 200,
          headers: corsHeaders(),
          body: JSON.stringify({ 
            message: "Bid placed successfully",
            bid: bidItem,
            newBid: bidAmount
          }),
        };

      } catch (error) {
        console.error("Error placing bid:", error);
        if (error.code === "ConditionalCheckFailedException") {
          return {
            statusCode: 409,
            headers: corsHeaders(),
            body: JSON.stringify({ message: "Auction was modified concurrently. Please try again." }),
          };
        }
        return {
          statusCode: 500,
          headers: corsHeaders(),
          body: JSON.stringify({ message: "Failed to place bid", error: error.message }),
        };
      }
    }

    // ---- FETCH ALL AUCTIONS ----
    if (event.httpMethod === "GET" && event.path === "/auctions") {
      console.log("Fetching all auctions");

      try {
        const result = await dynamo.scan({ TableName: TABLE_NAME }).promise();

        const auctions = (result.Items || []).filter(item => !item.id.startsWith('bid#'));

        // Process auctions to fix artist names
        const processedAuctions = await Promise.all(
          auctions.map(async (auction) => {
            return await fixAuctionArtistName(auction);
          })
        );

        const auctionsWithUrls = await Promise.all(
          processedAuctions.map(async (auction) => {
            if (auction.images && auction.images.length > 0) {
              try {
                const imageUrls = await Promise.all(
                  auction.images.map(async (imageEntry) => {
                    let imageKey = imageEntry;
                    if (imageEntry.includes('amazonaws.com/')) {
                      imageKey = imageEntry.split('amazonaws.com/')[1];
                    }
                    if (imageKey.includes('?')) imageKey = imageKey.split('?')[0];
                    if (imageKey.includes('%')) imageKey = decodeURIComponent(imageKey);
                    if (!imageKey.startsWith('public/')) imageKey = 'public/' + imageKey;

                    return s3.getSignedUrl('getObject', { Bucket: BUCKET_NAME, Key: imageKey, Expires: 3600 });
                  })
                );
                auction.images = imageUrls.filter(url => url !== null);
                auction.image = auction.images[0] || null;
              } catch (error) {
                console.error("Error generating presigned URLs:", error);
                auction.images = [];
                auction.image = null;
              }
            }
            return auction;
          })
        );

        return {
          statusCode: 200,
          headers: corsHeaders(),
          body: JSON.stringify(auctionsWithUrls),
        };
      } catch (error) {
        console.error("Error scanning DynamoDB:", error);
        return {
          statusCode: 500,
          headers: corsHeaders(),
          body: JSON.stringify({ message: "Failed to fetch auctions", error: error.message }),
        };
      }
    }

    // ---- FETCH AUCTION BY ID ----
    if (event.httpMethod === "GET" && event.pathParameters && event.pathParameters.id) {
      try {
        const auctionId = event.pathParameters.id;
        console.log("Fetching auction ID:", auctionId);

        const result = await dynamo.get({
          TableName: TABLE_NAME,
          Key: { auctionId: auctionId },
        }).promise();

        if (!result.Item) {
          return { statusCode: 404, headers: corsHeaders(), body: JSON.stringify({ message: "Auction not found" }) };
        }

        let auctionItem = result.Item;

        // ✅ FIX: Resolve artist name if it's a UUID
        auctionItem = await fixAuctionArtistName(auctionItem);

        if (auctionItem.images && auctionItem.images.length > 0) {
          try {
            const imageUrls = await Promise.all(
              auctionItem.images.map(async (imageEntry) => {
                let imageKey = imageEntry;
                if (imageEntry.includes('amazonaws.com/')) imageKey = imageEntry.split('amazonaws.com/')[1];
                if (imageKey.includes('?')) imageKey = imageKey.split('?')[0];
                if (imageKey.includes('%')) imageKey = decodeURIComponent(imageKey);
                if (!imageKey.startsWith('public/')) imageKey = 'public/' + imageKey;

                return s3.getSignedUrl('getObject', { Bucket: BUCKET_NAME, Key: imageKey, Expires: 3600 });
              })
            );
            auctionItem.images = imageUrls.filter(url => url !== null);
            auctionItem.image = auctionItem.images[0] || null;
          } catch (error) {
            console.error("Error generating presigned URLs:", error);
            auctionItem.images = [];
            auctionItem.image = null;
          }
        }

        return {
          statusCode: 200,
          headers: corsHeaders(),
          body: JSON.stringify(auctionItem),
        };

      } catch (error) {
        console.error("Error fetching auction by ID:", error);
        return { statusCode: 500, headers: corsHeaders(), body: JSON.stringify({ message: "Failed to fetch auction", error: error.message }) };
      }
    }

    return { statusCode: 404, headers: corsHeaders(), body: JSON.stringify({ message: "Endpoint not found" }) };

  } catch (error) {
    console.error("Error:", error);
    return { statusCode: 500, headers: corsHeaders(), body: JSON.stringify({ message: "Internal Server Error", error: error.message }) };
  }
};

// Helper function to fix artist name in auction objects
async function fixAuctionArtistName(auction) {
  console.log(`Processing auction artist: ${auction.artist}`);
  
  // If artist is a UUID, try to resolve it to a name
  if (auction.artist && isUUID(auction.artist)) {
    try {
      console.log(`Resolving artist UUID: ${auction.artist}`);
      
      // ✅ CORRECTED: Use the right table name and key field
      const artistResult = await dynamo.get({
        TableName: ARTISTS_TABLE_NAME,
        Key: { artistId: auction.artist } // ✅ Use artistId as key
      }).promise();
      
      console.log(`Artist query result: ${JSON.stringify(artistResult, null, 2)}`);
      
      if (artistResult.Item) {
        console.log(`Artist item found: ${JSON.stringify(artistResult.Item)}`);
        
        // ✅ CORRECTED: Use username field instead of name
        const artistName = artistResult.Item.username || "Unknown Artist";
        
        auction.artist = artistName;
        auction.artistName = artistName;
        console.log(`Resolved artist to: ${artistName}`);
      } else {
        console.log(`No artist found with ID: ${auction.artist}`);
        auction.artist = "Unknown Artist";
        auction.artistName = "Unknown Artist";
      }
    } catch (error) {
      console.error("Error resolving artist name:", error);
      auction.artist = "Unknown Artist";
      auction.artistName = "Unknown Artist";
    }
  } else if (auction.artistName) {
    auction.artist = auction.artistName;
  } else if (auction.artist) {
    auction.artistName = auction.artist;
  } else {
    auction.artist = "Unknown Artist";
    auction.artistName = "Unknown Artist";
  }
  
  return auction;
}

// Helper function to check if string is UUID
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
    "Access-Control-Allow-Credentials": true
  };
}