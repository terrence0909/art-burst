const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, UpdateCommand } = require("@aws-sdk/lib-dynamodb");

const client = new DynamoDBClient({ region: "us-east-1" });
const dynamo = DynamoDBDocumentClient.from(client);

exports.handler = async (event) => {
  console.log("WebSocket subscribe event:", JSON.stringify(event, null, 2));

  const connectionId = event.requestContext.connectionId;
  const body = JSON.parse(event.body || "{}");
  const { auctionId } = body;

  // Validate required fields
  if (!auctionId) {
    return {
      statusCode: 400,
      body: JSON.stringify({
        error: "Missing auctionId",
        code: "VALIDATION_ERROR"
      })
    };
  }

  try {
    // SIMPLIFIED: Always update the auctionId without conditions
    await dynamo.send(new UpdateCommand({
      TableName: process.env.CONNECTIONS_TABLE,
      Key: { connectionId },
      UpdateExpression: "SET auctionId = :auctionId, lastUpdated = :now",
      ExpressionAttributeValues: {
        ":auctionId": auctionId,
        ":now": Date.now()
      }
      // REMOVED ConditionExpression - always update the auctionId
    }));

    console.log("Subscription updated:", { connectionId, auctionId });
    return {
      statusCode: 200,
      body: JSON.stringify({
        message: "Subscribed to auction updates",
        auctionId: auctionId,
        status: "success"
      })
    };
  } catch (error) {
    console.error("Error updating subscription:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: "Internal server error",
        code: "INTERNAL_ERROR",
        details: error.message
      })
    };
  }
};