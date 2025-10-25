const AWS = require('aws-sdk');
AWS.config.update({ region: 'us-east-1' });

const dynamodb = new AWS.DynamoDB.DocumentClient();

async function testActiveIndex() {
  console.log('🎯 Testing ACTIVE userId-index\n');
  
  try {
    // Test the index with our known user
    const result = await dynamodb.query({
      TableName: 'WebSocketConnections',
      IndexName: 'userId-index',
      KeyConditionExpression: 'userId = :userId',
      ExpressionAttributeValues: {
        ':userId': 'user-wjfk744q'
      }
    }).promise();
    
    console.log(`✅ INDEX WORKING: Found ${result.Count} connections for user-wjfk744q`);
    console.log(`📊 Sample connection:`, JSON.stringify(result.Items[0], null, 2));
    
    // Test performance by comparing with scan
    console.log('\n⚡ Performance Test: Index vs Scan');
    
    const startIndex = Date.now();
    const indexResult = await dynamodb.query({
      TableName: 'WebSocketConnections',
      IndexName: 'userId-index',
      KeyConditionExpression: 'userId = :userId',
      ExpressionAttributeValues: {
        ':userId': 'user-wjfk744q'
      }
    }).promise();
    const indexTime = Date.now() - startIndex;
    
    const startScan = Date.now();
    const scanResult = await dynamodb.scan({
      TableName: 'WebSocketConnections',
      FilterExpression: 'userId = :userId',
      ExpressionAttributeValues: {
        ':userId': 'user-wjfk744q'
      }
    }).promise();
    const scanTime = Date.now() - startScan;
    
    console.log(`   Index query: ${indexTime}ms`);
    console.log(`   Scan: ${scanTime}ms`);
    console.log(`   Performance improvement: ${((scanTime - indexTime) / scanTime * 100).toFixed(1)}% faster`);
    
    return result.Count;
    
  } catch (error) {
    console.log('❌ Error testing index:', error.message);
    return 0;
  }
}

testActiveIndex();
