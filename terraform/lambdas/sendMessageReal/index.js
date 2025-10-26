const { DynamoDBClient, QueryCommand, PutItemCommand, ScanCommand } = require("@aws-sdk/client-dynamodb");
const { SESClient, SendEmailCommand } = require("@aws-sdk/client-ses");

const dynamodb = new DynamoDBClient({ region: "us-east-1" });
const ses = new SESClient({ region: "us-east-1" });

exports.handler = async (event) => {
    console.log('Event:', JSON.stringify(event, null, 2));
    
    const headers = {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
    };

    // Handle OPTIONS for CORS
    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers, body: '' };
    }

    // Handle GET requests for notifications
    if (event.httpMethod === 'GET' && event.path === '/sendMessage') {
        try {
            console.log('GET request received for notifications');
            const userId = event.queryStringParameters?.userId;
            const action = event.queryStringParameters?.action;
            
            console.log('Query params:', { userId, action });
            console.log('NOTIFICATIONS_TABLE:', process.env.NOTIFICATIONS_TABLE);
            
            if (action === 'getNotifications') {
                if (!userId) {
                    return {
                        statusCode: 400,
                        headers: headers,
                        body: JSON.stringify({ error: 'Missing userId parameter' })
                    };
                }

                console.log('Querying notifications for user:', userId);
                
                // Option 1: Try with GSI if it exists
                try {
                    const result = await dynamodb.send(new QueryCommand({
                        TableName: process.env.NOTIFICATIONS_TABLE,
                        IndexName: 'userId-index', // Try common GSI name
                        KeyConditionExpression: 'userId = :userId',
                        ExpressionAttributeValues: {
                            ':userId': { S: userId }
                        },
                        ScanIndexForward: false // Most recent first
                    }));

                    console.log('GSI Query result count:', result.Items ? result.Items.length : 0);
                    
                    // Convert DynamoDB items to plain objects safely
                    const notifications = result.Items ? result.Items.map(item => {
                        const notification = {};
                        if (item.notificationId && item.notificationId.S) notification.notificationId = item.notificationId.S;
                        if (item.userId && item.userId.S) notification.userId = item.userId.S;
                        if (item.message && item.message.S) notification.message = item.message.S;
                        if (item.timestamp && item.timestamp.S) notification.timestamp = item.timestamp.S;
                        if (item.type && item.type.S) notification.type = item.type.S;
                        if (item.read && item.read.BOOL !== undefined) notification.read = item.read.BOOL;
                        return notification;
                    }) : [];

                    console.log('Processed notifications:', notifications);

                    return {
                        statusCode: 200,
                        headers: headers,
                        body: JSON.stringify({
                            message: 'Notifications retrieved successfully',
                            notifications: notifications
                        })
                    };
                } catch (gsiError) {
                    console.log('GSI query failed, trying scan with filter:', gsiError.message);
                    
                    // Option 2: Use scan with filter (less efficient but works)
                    const scanResult = await dynamodb.send(new ScanCommand({
                        TableName: process.env.NOTIFICATIONS_TABLE,
                        FilterExpression: 'userId = :userId',
                        ExpressionAttributeValues: {
                            ':userId': { S: userId }
                        }
                    }));

                    console.log('Scan result count:', scanResult.Items ? scanResult.Items.length : 0);
                    
                    // Convert DynamoDB items to plain objects safely
                    const notifications = scanResult.Items ? scanResult.Items.map(item => {
                        const notification = {};
                        if (item.notificationId && item.notificationId.S) notification.notificationId = item.notificationId.S;
                        if (item.userId && item.userId.S) notification.userId = item.userId.S;
                        if (item.message && item.message.S) notification.message = item.message.S;
                        if (item.timestamp && item.timestamp.S) notification.timestamp = item.timestamp.S;
                        if (item.type && item.type.S) notification.type = item.type.S;
                        if (item.read && item.read.BOOL !== undefined) notification.read = item.read.BOOL;
                        return notification;
                    }) : [];

                    // Sort by timestamp descending (most recent first)
                    notifications.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

                    return {
                        statusCode: 200,
                        headers: headers,
                        body: JSON.stringify({
                            message: 'Notifications retrieved successfully',
                            notifications: notifications
                        })
                    };
                }
            } else {
                return {
                    statusCode: 400,
                    headers: headers,
                    body: JSON.stringify({ error: 'Missing action parameter. Use action=getNotifications' })
                };
            }
        } catch (error) {
            console.error('Error fetching notifications:', error);
            console.error('Error stack:', error.stack);
            return {
                statusCode: 500,
                headers: headers,
                body: JSON.stringify({ 
                    error: 'Failed to fetch notifications',
                    details: error.message 
                })
            };
        }
    }

    // Handle POST requests to /sendMessage
    if (event.httpMethod === 'POST' && event.path === '/sendMessage') {
        try {
            const body = JSON.parse(event.body);
            const { userId, message, email } = body;

            if (!userId || !message) {
                return {
                    statusCode: 400,
                    headers: headers,
                    body: JSON.stringify({ error: 'Missing required fields: userId and message are required' })
                };
            }

            // Store message in DynamoDB
            const timestamp = new Date().toISOString();
            const messageId = `${userId}-${timestamp}`;

            await dynamodb.send(new PutItemCommand({
                TableName: process.env.MESSAGES_TABLE,
                Item: {
                    messageId: { S: messageId },
                    userId: { S: userId },
                    message: { S: message },
                    timestamp: { S: timestamp },
                    email: { S: email || '' }
                }
            }));

            // Store notification in Notifications table
            const notificationId = `${userId}-${Date.now()}`;
            await dynamodb.send(new PutItemCommand({
                TableName: process.env.NOTIFICATIONS_TABLE,
                Item: {
                    notificationId: { S: notificationId },
                    userId: { S: userId },
                    message: { S: message },
                    timestamp: { S: timestamp },
                    type: { S: 'message' },
                    read: { BOOL: false }
                }
            }));

            // Send email notification if email is provided
            if (email) {
                try {
                    await ses.send(new SendEmailCommand({
                        Source: 'noreply@artburst.com',
                        Destination: {
                            ToAddresses: [email]
                        },
                        Message: {
                            Subject: {
                                Data: 'New Message from ArtBurst'
                            },
                            Body: {
                                Text: {
                                    Data: `You have a new message: ${message}`
                                }
                            }
                        }
                    }));
                } catch (emailError) {
                    console.error('Error sending email:', emailError);
                }
            }

            return {
                statusCode: 200,
                headers: headers,
                body: JSON.stringify({ 
                    message: 'Message sent successfully',
                    messageId: messageId,
                    notificationId: notificationId
                })
            };

        } catch (error) {
            console.error('Error:', error);
            return {
                statusCode: 500,
                headers: headers,
                body: JSON.stringify({ error: 'Failed to send message' })
            };
        }
    }

    // Return 404 for unsupported routes
    return {
        statusCode: 404,
        headers: headers,
        body: JSON.stringify({ error: 'Route not found' })
    };
};