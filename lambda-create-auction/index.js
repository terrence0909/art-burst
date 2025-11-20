// lambdas/index.js - FIXED WITH DRAFT/PUBLISH LOGIC
const { v4: uuidv4 } = require("uuid");
const AWS = require("aws-sdk");

const s3 = new AWS.S3({ region: "us-east-1" });
const dynamo = new AWS.DynamoDB.DocumentClient({ region: "us-east-1" });

const TABLE_NAME = process.env.TABLE_NAME;
const BUCKET_NAME = process.env.BUCKET_NAME;

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
      // FIXED: Validate and sanitize the status field
      const validStatuses = ["draft", "upcoming", "active", "live", "ended", "closed"];
      let status = body.status || "draft";
      
      // Ensure status is one of the valid values
      if (!validStatuses.includes(status.toLowerCase())) {
        console.warn(`Invalid status "${status}" provided, defaulting to "draft"`);
        status = "draft";
      }
      
      status = status.toLowerCase();
      
      console.log(`Creating auction with status: "${status}"`);

      // Generate unique ID
      const auctionId = uuidv4();

      const auctionWithId = {
        ...body,
        id: auctionId,
        auctionId,
        // FIXED: Explicitly set the validated status
        status: status,
        // FIXED: Add itemType for GSI queries if needed
        itemType: "auction",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      console.log("Saving to DynamoDB:", JSON.stringify(auctionWithId, null, 2));

      // Save to DynamoDB
      await dynamo.put({
        TableName: TABLE_NAME,
        Item: auctionWithId,
      }).promise();

      console.log(`Auction created with status "${status}":`, auctionId);

      return {
        statusCode: 201,
        headers: corsHeaders(),
        body: JSON.stringify({
          message: status === "draft" ? "Draft saved successfully" : "Auction published successfully",
          id: auctionId,
          auctionId,
          status: status,
          auction: auctionWithId,
        }),
      };
    }

    // ---- FETCH ALL AUCTIONS ----
    if (event.httpMethod === "GET" && event.path === "/auctions") {
      console.log("Fetching auctions");
      
      // FIXED: Check for query parameter to filter by status
      const publishedOnly = event.queryStringParameters?.publishedOnly === 'true';
      
      if (publishedOnly) {
        console.log("Fetching only published auctions (excluding drafts)");
      }
      
      try {
        // Scan DynamoDB table to get all auctions
        const result = await dynamo.scan({
          TableName: TABLE_NAME,
        }).promise();
        
        console.log("Found total auctions:", result.Items?.length || 0);
        
        if (!result.Items || result.Items.length === 0) {
          return {
            statusCode: 200,
            headers: corsHeaders(),
            body: JSON.stringify([]),
          };
        }

        // FIXED: Filter out drafts on the backend
        let auctions = result.Items;
        if (publishedOnly) {
          auctions = auctions.filter(auction => {
            const status = auction.status || "draft";
            const isDraft = status.toLowerCase() === "draft";
            return !isDraft;
          });
          console.log(`Filtered to ${auctions.length} published auctions (removed ${result.Items.length - auctions.length} drafts)`);
        }
        
        // Generate presigned URLs for images in each auction
        const auctionsWithUrls = await Promise.all(
          auctions.map(async (auction) => {
            if (auction.images && auction.images.length > 0) {
              try {
                const imageUrls = await Promise.all(
                  auction.images.map(async (imageEntry) => {
                    try {
                      let imageKey = imageEntry;
                      
                      // Extract just the S3 key
                      if (imageEntry.includes('amazonaws.com/')) {
                        const parts = imageEntry.split('amazonaws.com/');
                        imageKey = parts[1];
                      }
                      
                      if (imageKey.includes('?')) {
                        imageKey = imageKey.split('?')[0];
                      }
                      
                      if (imageKey.includes('%')) {
                        imageKey = decodeURIComponent(imageKey);
                      }
                      
                      if (!imageKey.startsWith('public/') && !imageKey.startsWith('public%2F')) {
                        imageKey = 'public/' + imageKey;
                      }
                      
                      if (imageKey.startsWith('public%2F')) {
                        imageKey = imageKey.replace('public%2F', 'public/');
                      }
                      
                      const url = s3.getSignedUrl('getObject', {
                        Bucket: BUCKET_NAME,
                        Key: imageKey,
                        Expires: 3600
                      });
                      
                      return url;
                    } catch (urlError) {
                      console.error("Error generating URL for entry:", imageEntry, urlError);
                      return null;
                    }
                  })
                );
                
                auction.images = imageUrls.filter(url => url !== null);
                auction.image = auction.images[0] || null;
              } catch (error) {
                console.error("Error generating presigned URLs for auction:", auction.id, error);
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
          body: JSON.stringify({ 
            message: "Failed to fetch auctions", 
            error: error.message 
          }),
        };
      }
    }

    // ---- FETCH AUCTION BY ID ----
    if (event.httpMethod === "GET" && event.pathParameters && event.pathParameters.id) {
      const auctionId = event.pathParameters.id;
      console.log("Fetching auction ID:", auctionId);

      // Use 'id' as the key instead of 'auctionId'
      const result = await dynamo.get({
        TableName: TABLE_NAME,
        Key: { id: auctionId },
      }).promise();

      console.log("DynamoDB result:", JSON.stringify(result, null, 2));

      if (!result.Item) {
        console.log("Auction not found:", auctionId);
        return {
          statusCode: 404,
          headers: corsHeaders(),
          body: JSON.stringify({ message: "Auction not found" }),
        };
      }

      let auctionItem = result.Item;
      
      // Generate presigned URLs for images (if they exist)
      if (auctionItem.images && auctionItem.images.length > 0) {
        console.log("Original image entries:", auctionItem.images);
        
        try {
          // Generate presigned URLs for all images - ADD public/ prefix
          const imageUrls = await Promise.all(
            auctionItem.images.map(async (imageEntry) => {
              try {
                // Extract just the S3 key from the entry
                let imageKey = imageEntry;
                
                // If it's a full URL, extract just the key part after amazonaws.com/
                if (imageEntry.includes('amazonaws.com/')) {
                  const parts = imageEntry.split('amazonaws.com/');
                  imageKey = parts[1];
                  console.log("Extracted S3 key from URL:", imageKey);
                }
                
                // If it's a presigned URL (contains ?), extract just the key part before ?
                if (imageKey.includes('?')) {
                  imageKey = imageKey.split('?')[0];
                  console.log("Removed query params from key:", imageKey);
                }
                
                // URL decode the key if it's encoded
                if (imageKey.includes('%')) {
                  imageKey = decodeURIComponent(imageKey);
                  console.log("URL decoded key:", imageKey);
                }
                
                // ADD THE public/ PREFIX if it's missing and doesn't already have it
                if (!imageKey.startsWith('public/') && !imageKey.startsWith('public%2F')) {
                  imageKey = 'public/' + imageKey;
                  console.log("Added public/ prefix to key:", imageKey);
                }
                
                // Handle URL encoded public prefix
                if (imageKey.startsWith('public%2F')) {
                  imageKey = imageKey.replace('public%2F', 'public/');
                  console.log("Decoded public/ prefix:", imageKey);
                }
                
                // Generate presigned URL using the Lambda's IAM role
                const url = s3.getSignedUrl('getObject', {
                  Bucket: BUCKET_NAME,
                  Key: imageKey,
                  Expires: 3600
                });
                
                console.log("Generated presigned URL for key:", imageKey);
                return url;
              } catch (urlError) {
                console.error("Error generating URL for entry:", imageEntry, urlError);
                return null;
              }
            })
          );
          
          // Filter out any failed URLs and update the item
          auctionItem.images = imageUrls.filter(url => url !== null);
          auctionItem.image = auctionItem.images[0] || null;
          
          console.log("Final image URLs:", auctionItem.images);
        } catch (error) {
          console.error("Error generating presigned URLs:", error);
          // Don't fail the entire request if image URLs fail
          auctionItem.images = [];
          auctionItem.image = null;
        }
      }

      return {
        statusCode: 200,
        headers: corsHeaders(),
        body: JSON.stringify(auctionItem),
      };
    }

    return {
      statusCode: 404,
      headers: corsHeaders(),
      body: JSON.stringify({ message: "Endpoint not found" }),
    };
  } catch (error) {
    console.error("Error:", error);
    return {
      statusCode: 500,
      headers: corsHeaders(),
      body: JSON.stringify({ 
        message: "Internal Server Error", 
        error: error.message
      }),
    };
  }
};

function corsHeaders() {
  return {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Credentials": true
  };
}
