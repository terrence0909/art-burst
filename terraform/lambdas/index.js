// lambdas/index.js - COMPLETE FIXED VERSION
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
      // Generate unique ID
      const auctionId = uuidv4();

      const auctionWithId = {
        ...body,
        id: auctionId,
        auctionId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      console.log("Saving to DynamoDB:", JSON.stringify(auctionWithId, null, 2));

      // Save to DynamoDB
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

    // ---- FETCH AUCTION BY ID ----
    if (event.httpMethod === "GET" && event.pathParameters && event.pathParameters.id) {
      const auctionId = event.pathParameters.id;
      console.log("Fetching auction ID:", auctionId);

      // FIXED: Use 'id' as the key instead of 'auctionId'
      const result = await dynamo.get({
        TableName: TABLE_NAME,
        Key: { id: auctionId }, // CHANGED FROM: { auctionId: auctionId }
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