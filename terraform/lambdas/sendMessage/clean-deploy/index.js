const AWS = require('aws-sdk');
const dynamodb = new AWS.DynamoDB.DocumentClient();
const ApiGatewayManagementApi = require('aws-sdk/clients/apigatewaymanagementapi');

exports.handler = async (event) => {
  console.log('=== WebSocketSubscribe START ===');
  
  try {
    const { action, message, receiverId, senderId } = event;
    
    if (!action || action !== 'newMessage') {
      return { success: false, error: 'Action newMessage is required' };
    }
    
    if (!receiverId || !message) {
      return { success: false, error: 'receiverId and message are required' };
    }
    
    console.log(`Broadcasting to: ${receiverId}, Message: ${message.content}`);
    
    // Get connections for receiver and sender
    const [receiverConnections, senderConnections] = await Promise.all([
      getConnectionsByUserId(receiverId),
      getConnectionsByUserId(senderId)
    ]);
    
    console.log(`Found ${receiverConnections.length} receiver connections, ${senderConnections.length} sender connections`);
    
    // Combine and validate connections
    const allConnections = [...receiverConnections, ...senderConnections];
    const validConnections = allConnections.filter(conn => 
      conn && conn.connectionId && conn.domainName && conn.stage
    );
    
    // Remove duplicates
    const uniqueConnections = [];
    const seen = new Set();
    validConnections.forEach(conn => {
      if (!seen.has(conn.connectionId)) {
        seen.add(conn.connectionId);
        uniqueConnections.push(conn);
      }
    });
    
    console.log(`Sending to ${uniqueConnections.length} unique connections`);
    
    // Send to each connection
    const results = await Promise.allSettled(
      uniqueConnections.map(conn => sendToConnection(conn, { action, message }))
    );
    
    const successful = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;
    
    console.log(`Results: ${successful} successful, ${failed} failed`);
    console.log('=== WebSocketSubscribe END ===');
    
    return {
      success: true,
      deliveredTo: successful,
      failed: failed,
      totalConnections: uniqueConnections.length
    };
    
  } catch (error) {
    console.error('Error:', error);
    return { success: false, error: error.message };
  }
};

async function getConnectionsByUserId(userId) {
  try {
    // Try index first
    const result = await dynamodb.query({
      TableName: 'WebSocketConnections',
      IndexName: 'userId-index',
      KeyConditionExpression: 'userId = :userId',
      ExpressionAttributeValues: { ':userId': userId }
    }).promise();
    return result.Items || [];
  } catch (indexError) {
    // Fallback to scan
    const scanResult = await dynamodb.scan({
      TableName: 'WebSocketConnections',
      FilterExpression: 'userId = :userId',
      ExpressionAttributeValues: { ':userId': userId }
    }).promise();
    return scanResult.Items || [];
  }
}

async function sendToConnection(connection, data) {
  const { connectionId, domainName, stage } = connection;
  
  try {
    const apiGateway = new ApiGatewayManagementApi({
      endpoint: `https://${domainName}/${stage}`
    });
    
    await apiGateway.postToConnection({
      ConnectionId: connectionId,
      Data: JSON.stringify(data)
    }).promise();
    
    return { success: true, connectionId };
  } catch (error) {
    if (error.statusCode === 410) {
      // Remove stale connection
      await dynamodb.delete({
        TableName: 'WebSocketConnections',
        Key: { connectionId }
      }).promise();
    }
    throw error;
  }
}
