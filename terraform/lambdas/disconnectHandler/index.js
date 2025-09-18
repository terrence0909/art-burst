const { DynamoDBClient, DeleteItemCommand } = require("@aws-sdk/client-dynamodb");

const dynamo = new DynamoDBClient({ region: "us-east-1" });

exports.handler = async (event) => {
  const connectionId = event.requestContext.connectionId;
  
  console.log("Disconnecting connection:", connectionId);
  
  try {
    await dynamo.send(new DeleteItemCommand({
      TableName: process.env.CONNECTIONS_TABLE,
      Key: { connectionId: { S: connectionId } }
    }));
    
    console.log("Successfully removed connection:", connectionId);
    return { statusCode: 200, body: "Disconnected" };
    
  } catch (error) {
    console.error("Error removing connection:", error);
    return { statusCode: 500, body: "Error during disconnect" };
  }
};