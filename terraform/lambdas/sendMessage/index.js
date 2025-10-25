// terraform/lambdas/sendMessage/index.js
const AWS = require('aws-sdk');
const dynamodb = new AWS.DynamoDB.DocumentClient();
const ApiGatewayManagementApi = require('aws-sdk/clients/apigatewaymanagementapi');

exports.handler = async (event) => {
  try {
    const conversationId = event.pathParameters.id;
    const { content, receiverId, auctionId } = JSON.parse(event.body);
    const senderId = event.requestContext.authorizer.claims.sub;
    
    const messageId = `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const message = {
      messageId,
      conversationId,
      senderId,
      receiverId,
      content,
      timestamp: new Date().toISOString(),
      read: false,
      auctionId: auctionId || null
    };
    
    // Save message to DynamoDB
    await dynamodb.put({
      TableName: process.env.MESSAGES_TABLE,
      Item: message
    }).promise();
    
    // Update conversation last message
    await dynamodb.update({
      TableName: process.env.CONVERSATIONS_TABLE,
      Key: { conversationId },
      UpdateExpression: 'SET lastMessage = :msg, lastMessageTimestamp = :ts',
      ExpressionAttributeValues: {
        ':msg': content,
        ':ts': new Date().toISOString()
      }
    }).promise();
    
    // Broadcast to WebSocket connections
    await broadcastMessage(conversationId, message);
    
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
      },
      body: JSON.stringify(message)
    };
  } catch (error) {
    console.error('Error sending message:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal server error' })
    };
  }
};

async function broadcastMessage(conversationId, message) {
  try {
    // Get all connection IDs for this conversation
    const connections = await dynamodb.query({
      TableName: process.env.WS_CONNECTIONS_TABLE,
      IndexName: 'conversationId-index',
      KeyConditionExpression: 'conversationId = :cid',
      ExpressionAttributeValues: { ':cid': conversationId }
    }).promise();
    
    const apiGateway = new ApiGatewayManagementApi({
      endpoint: process.env.WS_API_ENDPOINT
    });
    
    // Send message to all subscribers
    const broadcastPromises = connections.Items.map(async (connection) => {
      try {
        await apiGateway.postToConnection({
          ConnectionId: connection.connectionId,
          Data: JSON.stringify({
            type: 'NEW_MESSAGE',
            messageData: message
          })
        }).promise();
      } catch (err) {
        // Remove stale connections
        if (err.statusCode === 410) {
          await dynamodb.delete({
            TableName: process.env.WS_CONNECTIONS_TABLE,
            Key: { connectionId: connection.connectionId }
          }).promise();
        }
      }
    });
    
    await Promise.all(broadcastPromises);
  } catch (error) {
    console.error('Error broadcasting message:', error);
  }
}