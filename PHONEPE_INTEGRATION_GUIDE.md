# PhonePe Integration Guide

## ⚠️ Important Security Warning
**NEVER** use your PhonePe `SALT_KEY` or `MERCHANT_ID` directly in your React (Frontend) code. 
If you do this, hackers can steal your credentials and manipulate payments.
You **MUST** use a backend server (Node.js, Python, or Firebase Cloud Functions) to handle the actual communication with PhonePe.

## Overview of the Flow
1. **Frontend (React)**: User clicks "Pay". React sends the amount and order details to **your** Backend.
2. **Backend**: 
    - Creates a unique payload (base64 encoded).
    - Signs it using your `SALT_KEY` (SHA256 hash).
    - Sends this request to PhonePe API.
    - Returns a "Redirect URL" to the Frontend.
3. **Frontend**: Redirects the user's browser to that "Redirect URL" (PhonePe's payment page).
4. **PhonePe**: User pays. PhonePe sends a notification (Webhook) to your Backend.

## How to Implement (Step-by-Step)

### 1. Get Credentials
Go to [PhonePe Merchant Dashboard](https://business.phonepe.com/) (or use their Test/Sandbox credentials for development).
You will need:
- `MERCHANT_ID`
- `SALT_KEY`
- `SALT_INDEX`

### 2. Create a Backend Server (Node.js Example)
You need a simple server. If you don't have one, create a folder `backend` and run `npm init -y` and `npm install express axios crypto cors`.

**`backend/server.js`**:
```javascript
const express = require('express');
const axios = require('axios');
const crypto = require('crypto');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());

// CONSTANTS (Store these in .env file in production!)
const MERCHANT_ID = "YOUR_MERCHANT_ID";
const SALT_KEY = "YOUR_SALT_KEY";
const SALT_INDEX = 1;
const PHONEPE_HOST_URL = "https://api-preprod.phonepe.com/apis/pg-sandbox"; // Use Prod URL for live

app.post('/api/pay', async (req, res) => {
    const { amount, userId, orderId } = req.body; // frontend sends this

    // 1. Create Payload
    const payload = {
        merchantId: MERCHANT_ID,
        merchantTransactionId: orderId, // Unique ID
        merchantUserId: userId,
        amount: amount * 100, // Amount in paise
        redirectUrl: `http://localhost:3000/order-success?id=${orderId}`, // Where to go after payment
        redirectMode: "REDIRECT",
        callbackUrl: "https://your-backend.com/api/callback", // Backend webhook for server-to-server update
        paymentInstrument: {
            type: "PAY_PAGE"
        }
    };

    const bufferObj = Buffer.from(JSON.stringify(payload), "utf8");
    const base64EncodedPayload = bufferObj.toString("base64");

    // 2. Compute Checksum (X-VERIFY Header)
    // SHA256(base64Payload + "/pg/v1/pay" + saltKey) + ### + saltIndex
    const stringToHash = base64EncodedPayload + "/pg/v1/pay" + SALT_KEY;
    const sha256 = crypto.createHash('sha256').update(stringToHash).digest('hex');
    const xVerify = sha256 + "###" + SALT_INDEX;

    // 3. Send Request to PhonePe
    try {
        const response = await axios.post(`${PHONEPE_HOST_URL}/pg/v1/pay`, {
            request: base64EncodedPayload
        }, {
            headers: {
                'Content-Type': 'application/json',
                'X-VERIFY': xVerify
            }
        });

        // 4. Send Redirect URL to Frontend
        const redirectUrl = response.data.data.instrumentResponse.redirectInfo.url;
        res.json({ url: redirectUrl });

    } catch (error) {
        console.error("Payment Error", error.response ? error.response.data : error.message);
        res.status(500).json({ error: "Payment initiation failed" });
    }
});

app.listen(5000, () => console.log("Backend running on port 5000"));
```

### 3. Update Frontend (`UserMenu.jsx`)
Replace the current simulation logic with a fetch call to your backend.

```javascript
const handlePayment = async () => {
    try {
        // Call YOUR backend
        const res = await fetch('http://localhost:5000/api/pay', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                amount: totalAmount,
                userId: "user_123", // Get actual UID
                orderId: "ORDER_" + Date.now()
            })
        });

        const data = await res.json();
        
        if (data.url) {
            // Redirect user to PhonePe
            window.location.href = data.url; 
        }
    } catch (error) {
        toast.error("Payment failed");
    }
};
```
