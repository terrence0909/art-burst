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
    let conversationId;
    
    if (event.pathParameters && event.pathParameters.id) {
      conversationId = event.pathParameters.id;
    } else if (event.queryStringParameters && event.queryStringParameters.conversationId) {
      conversationId = event.queryStringParameters.conversationId;
    } else if (event.body) {
      const body = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
      conversationId = body.conversationId;
    }
    
    let messages = [];
    
    if (!conversationId) {
      const result = await dynamodb.scan({
        TableName: process.env.MESSAGES_TABLE,
        Limit: 20
      }).promise();
      
      messages = (result.Items || []).sort((a, b) => 
        new Date(b.timestamp) - new Date(a.timestamp)
      );
    } else {
      const result = await dynamodb.query({
        TableName: process.env.MESSAGES_TABLE,
        IndexName: 'conversationId-index',
        KeyConditionExpression: 'conversationId = :convId',
        ExpressionAttributeValues: {
          ':convId': conversationId
        },
        ScanIndexForward: true
      }).promise();

      messages = result.Items || [];
    }
    
    // RETURN PURE ARRAY - no wrapper!
    return {
      statusCode: 200,
      headers: headers,
      body: JSON.stringify(messages) // Just the array!
    };
    
  } catch (error) {
    return {
      statusCode: 500,
      headers: headers,
      body: JSON.stringify([]) // Empty array on error
    };
  }
};
