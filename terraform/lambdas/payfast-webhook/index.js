// payfast-webhook/index.js
const AWS = require("aws-sdk");
const crypto = require("crypto");
const querystring = require("querystring");

const dynamo = new AWS.DynamoDB.DocumentClient({ region: "us-east-1" });
const TABLE_NAME = process.env.TABLE_NAME || "artburst-auctions";
const PAYMENTS_TABLE = process.env.PAYMENTS_TABLE || "Payments";

// PayFast credentials from environment variables
const PAYFAST_MERCHANT_ID = process.env.PAYFAST_MERCHANT_ID;
const PAYFAST_MERCHANT_KEY = process.env.PAYFAST_MERCHANT_KEY;
const PAYFAST_PASSPHRASE = process.env.PAYFAST_PASSPHRASE;
const PAYFAST_SANDBOX = process.env.PAYFAST_SANDBOX === "true";

exports.handler = async (event) => {
  console.log("PayFast webhook received:", JSON.stringify(event, null, 2));

  try {
    // Parse POST body from PayFast
    const body = event.isBase64Encoded 
      ? Buffer.from(event.body, 'base64').toString('utf-8')
      : event.body;
    
    const itnData = querystring.parse(body);
    
    console.log("Parsed ITN data:", itnData);

    // Validate PayFast signature
    if (!validateSignature(itnData)) {
      console.error("❌ Invalid PayFast signature");
      return {
        statusCode: 400,
        headers: { "Content-Type": "text/plain" },
        body: "Invalid signature"
      };
    }

    console.log("✅ Signature validated");

    // Extract payment details
    const paymentStatus = itnData.payment_status;
    const auctionId = itnData.custom_str1; // Your auction ID from custom_str1
    const paymentId = itnData.pf_payment_id;
    const amount = parseFloat(itnData.amount_gross);
    
    if (!auctionId) {
      console.error("❌ No auction ID in payment data");
      return {
        statusCode: 400,
        headers: { "Content-Type": "text/plain" },
        body: "No auction ID"
      };
    }

    // Store payment record
    await storePaymentRecord({
      paymentId,
      auctionId,
      amount,
      status: paymentStatus,
      payerEmail: itnData.email_address,
      payerName: `${itnData.name_first || ''} ${itnData.name_last || ''}`.trim(),
      merchantTradeId: itnData.m_payment_id,
      timestamp: new Date().toISOString(),
      rawData: itnData
    });

    // Handle payment status
    switch (paymentStatus) {
      case 'COMPLETE':
        await handleSuccessfulPayment(auctionId, paymentId, amount, itnData);
        break;
      
      case 'FAILED':
        await handleFailedPayment(auctionId, paymentId);
        break;
      
      case 'CANCELLED':
        await handleCancelledPayment(auctionId, paymentId);
        break;
      
      case 'PENDING':
        await handlePendingPayment(auctionId, paymentId);
        break;
      
      default:
        console.warn("⚠️ Unknown payment status:", paymentStatus);
    }

    // PayFast requires 200 OK
    return {
      statusCode: 200,
      headers: { "Content-Type": "text/plain" },
      body: "OK"
    };

  } catch (error) {
    console.error("💥 Webhook error:", error);
    return {
      statusCode: 500,
      headers: { "Content-Type": "text/plain" },
      body: "Internal error"
    };
  }
};

// Validate PayFast signature
function validateSignature(data) {
  const receivedSignature = data.signature;
  const dataToValidate = { ...data };
  delete dataToValidate.signature;
  
  // Create parameter string
  let paramString = '';
  const sortedKeys = Object.keys(dataToValidate).sort();
  
  for (const key of sortedKeys) {
    const value = dataToValidate[key];
    if (value !== '' && value !== null && value !== undefined) {
      paramString += `${key}=${encodeURIComponent(value.toString().trim()).replace(/%20/g, '+')}&`;
    }
  }
  
  // Remove last ampersand
  paramString = paramString.slice(0, -1);
  
  // Add passphrase if configured (production only)
  if (PAYFAST_PASSPHRASE) {
    paramString += `&passphrase=${encodeURIComponent(PAYFAST_PASSPHRASE.trim()).replace(/%20/g, '+')}`;
  }
  
  // Generate MD5 hash
  const calculatedSignature = crypto
    .createHash('md5')
    .update(paramString)
    .digest('hex');
  
  console.log("Signature validation:", {
    received: receivedSignature,
    calculated: calculatedSignature,
    match: receivedSignature === calculatedSignature
  });
  
  return receivedSignature === calculatedSignature;
}

// Store payment record in DynamoDB
async function storePaymentRecord(paymentData) {
  try {
    await dynamo.put({
      TableName: PAYMENTS_TABLE,
      Item: {
        paymentId: paymentData.paymentId,
        auctionId: paymentData.auctionId,
        amount: paymentData.amount,
        status: paymentData.status,
        payerEmail: paymentData.payerEmail,
        payerName: paymentData.payerName,
        merchantTradeId: paymentData.merchantTradeId,
        createdAt: paymentData.timestamp,
        updatedAt: paymentData.timestamp,
        rawData: paymentData.rawData
      }
    }).promise();
    
    console.log("✅ Payment record stored:", paymentData.paymentId);
  } catch (error) {
    console.error("❌ Failed to store payment record:", error);
    throw error;
  }
}

// Handle successful payment
async function handleSuccessfulPayment(auctionId, paymentId, amount, itnData) {
  console.log("💰 Processing successful payment:", { auctionId, paymentId, amount });

  try {
    // Update auction with payment details - using auctionId as the key
    await dynamo.update({
      TableName: TABLE_NAME,
      Key: { auctionId: auctionId }, // Match your table's hash key
      UpdateExpression: 'SET paymentStatus = :paid, paymentId = :paymentId, paidAmount = :amount, paidAt = :timestamp, #status = :closed, updatedAt = :timestamp',
      ExpressionAttributeNames: {
        '#status': 'status' // status is a reserved word
      },
      ExpressionAttributeValues: {
        ':paid': 'paid',
        ':paymentId': paymentId,
        ':amount': amount,
        ':closed': 'closed',
        ':timestamp': new Date().toISOString()
      }
    }).promise();
    
    console.log("✅ Auction marked as paid and closed:", auctionId);

    // TODO: Send confirmation email
    // TODO: Notify seller
    
  } catch (error) {
    console.error("❌ Failed to update auction:", error);
    throw error;
  }
}

// Handle failed payment
async function handleFailedPayment(auctionId, paymentId) {
  console.log("❌ Processing failed payment:", { auctionId, paymentId });

  await dynamo.update({
    TableName: TABLE_NAME,
    Key: { auctionId: auctionId },
    UpdateExpression: 'SET paymentStatus = :failed, paymentId = :paymentId, updatedAt = :timestamp',
    ExpressionAttributeValues: {
      ':failed': 'payment_failed',
      ':paymentId': paymentId,
      ':timestamp': new Date().toISOString()
    }
  }).promise();
  
  console.log("✅ Auction marked as payment failed");
}

// Handle cancelled payment
async function handleCancelledPayment(auctionId, paymentId) {
  console.log("🚫 Processing cancelled payment:", { auctionId, paymentId });

  await dynamo.update({
    TableName: TABLE_NAME,
    Key: { auctionId: auctionId },
    UpdateExpression: 'SET paymentStatus = :cancelled, paymentId = :paymentId, updatedAt = :timestamp',
    ExpressionAttributeValues: {
      ':cancelled': 'payment_cancelled',
      ':paymentId': paymentId,
      ':timestamp': new Date().toISOString()
    }
  }).promise();
  
  console.log("✅ Auction marked as payment cancelled");
}

// Handle pending payment
async function handlePendingPayment(auctionId, paymentId) {
  console.log("⏳ Processing pending payment:", { auctionId, paymentId });

  await dynamo.update({
    TableName: TABLE_NAME,
    Key: { auctionId: auctionId },
    UpdateExpression: 'SET paymentStatus = :pending, paymentId = :paymentId, updatedAt = :timestamp',
    ExpressionAttributeValues: {
      ':pending': 'payment_pending',
      ':paymentId': paymentId,
      ':timestamp': new Date().toISOString()
    }
  }).promise();
  
  console.log("✅ Auction marked as payment pending");
}