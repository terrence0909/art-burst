const AWS = require('aws-sdk');
const dynamodb = new AWS.DynamoDB.DocumentClient();

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': 'https://terrence0909.github.io',
    'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Amz-Security-Token',
    'Access-Control-Allow-Methods': 'OPTIONS,POST,GET,PUT,DELETE',
    'Access-Control-Allow-Credentials': 'true'
  };

  try {
    console.log('sendMessage event:', JSON.stringify(event, null, 2));
    
    // Parse the request body
    const requestBody = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
    const { content, receiverId, auctionId, conversationId } = requestBody;
    
    // Get sender from Cognito
    const senderId = event.requestContext?.authorizer?.claims?.sub;
    
    console.log('Received data:', { content, receiverId, auctionId, conversationId, senderId });
    
    if (!content || !receiverId) {
      return {
        statusCode: 400,
        headers: headers,
        body: JSON.stringify({ 
          success: false,
          error: 'content and receiverId are required' 
        })
      };
    }

    let finalConversationId = conversationId;
    let createdNewConversation = false;
    
    // If no conversationId, create a new conversation
    if (!finalConversationId) {
      console.log('No conversationId provided, creating new conversation');
      
      finalConversationId = `conv-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const participants = [senderId, receiverId].filter(Boolean);
      const participantsString = participants.sort().join(',');
      
      const conversation = {
        conversationId: finalConversationId,
        participants: participantsString,
        participantList: participants,
        auctionId: auctionId || null,
        createdAt: new Date().toISOString(),
        lastMessage: content,
        lastMessageTimestamp: new Date().toISOString()
      };
      
      await dynamodb.put({
        TableName: process.env.CONVERSATIONS_TABLE,
        Item: conversation
      }).promise();
      
      createdNewConversation = true;
      console.log('Created new conversation:', finalConversationId);
    }

    const messageId = `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const message = {
      messageId,
      conversationId: finalConversationId,
      senderId,
      receiverId,
      content,
      timestamp: new Date().toISOString(),
      read: false,
      auctionId: auctionId || null
    };

    await dynamodb.put({
      TableName: process.env.MESSAGES_TABLE,
      Item: message
    }).promise();

    await dynamodb.update({
      TableName: process.env.CONVERSATIONS_TABLE,
      Key: { conversationId: finalConversationId },
      UpdateExpression: 'set lastMessage = :msg, lastMessageTimestamp = :ts',
      ExpressionAttributeValues: {
        ':msg': content,
        ':ts': new Date().toISOString()
      }
    }).promise();

    // BROADCAST THE MESSAGE VIA WEBSOCKET
    try {
      console.log('Broadcasting message via WebSocket');
      
      const lambda = new AWS.Lambda();
      
      // Use your existing WebSocket infrastructure
      // The WebSocketSubscribe function should handle broadcasting
      await lambda.invoke({
        FunctionName: 'WebSocketSubscribe',
        InvocationType: 'Event',
        Payload: JSON.stringify({
          action: 'newMessage',
          message: message,
          conversationId: finalConversationId,
          receiverId: receiverId,
          senderId: senderId
        })
      }).promise();
      
      console.log('Message broadcast triggered via WebSocketSubscribe');
    } catch (wsError) {
      console.log('WebSocket broadcast failed (may be normal):', wsError.message);
      // Don't fail the entire request if broadcast fails
    }

    return {
      statusCode: 200,
      headers: headers,
      body: JSON.stringify({
        success: true,
        message: {
          id: messageId,
          content: content,
          senderId: senderId,
          receiverId: receiverId,
          timestamp: new Date().toISOString(),
          conversationId: finalConversationId
        },
        conversationId: finalConversationId,
        createdNewConversation: createdNewConversation
      })
    };
    
  } catch (error) {
    console.error('Error in sendMessage:', error);
    return {
      statusCode: 500,
      headers: headers,
      body: JSON.stringify({
        success: false,
        error: error.message
      })
    };
  }
};
