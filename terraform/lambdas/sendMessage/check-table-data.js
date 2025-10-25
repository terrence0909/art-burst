const AWS = require('aws-sdk');
AWS.config.update({ region: 'us-east-1' });

const dynamodb = new AWS.DynamoDB.DocumentClient();

async function checkTableData() {
  console.log('🔍 Checking WebSocketConnections table data structure\n');
  
  try {
    // Get a few sample items to see the actual structure
    const result = await dynamodb.scan({
      TableName: 'WebSocketConnections',
      Limit: 3
    }).promise();
    
    console.log('📊 Sample items from WebSocketConnections:');
    result.Items.forEach((item, index) => {
      console.log(`\nItem ${index + 1}:`);
      console.log(JSON.stringify(item, null, 2));
    });
    
    // Check if userId field exists in any items
    const hasUserId = result.Items.some(item => item.userId);
    console.log(`\n🔑 Does any item have 'userId' field: ${hasUserId}`);
    
    // Check what fields actually exist
    const allFields = new Set();
    result.Items.forEach(item => {
      Object.keys(item).forEach(field => allFields.add(field));
    });
    console.log('📋 All fields found:', Array.from(allFields));
    
  } catch (error) {
    console.log('❌ Error:', error.message);
  }
}

checkTableData();
