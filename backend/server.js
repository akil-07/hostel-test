const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
const axios = require('axios');
const app = express();

app.use(cors());
app.use(express.json());

// --- PHONEPE SANDBOX CREDENTIALS (FOR TESTING) ---
// These are public test credentials provided by PhonePe. 
// When you go live, replace these with the keys from your screenshot dashboard.
const MERCHANT_ID = "PGTESTPAYUAT";
const SALT_KEY = "099eb0cd-02cf-4e2a-8aca-3e6c6aff0399";
const SALT_INDEX = 1;
const PHONEPE_HOST_URL = "https://api-preprod.phonepe.com/apis/pg-sandbox";
const APP_BE_URL = "http://localhost:5000"; // Your Backend URL
const CLIENT_URL = "http://localhost:5173"; // Your Frontend URL (Vite default)

app.post('/api/pay', async (req, res) => {
    try {
        const { amount, userId, mobileNumber, name } = req.body;
        const orderId = "ORDER_" + Date.now();

        // 1. Construct the Payload
        const payload = {
            merchantId: MERCHANT_ID,
            merchantTransactionId: orderId,
            merchantUserId: userId,
            amount: amount * 100, // Amount in paise (e.g. 100 INR = 10000 paise)
            redirectUrl: `${APP_BE_URL}/api/status/${orderId}`, // PhonePe redirects here after payment
            redirectMode: "POST",
            mobileNumber: mobileNumber,
            paymentInstrument: {
                type: "PAY_PAGE"
            }
        };

        // 2. Encode Payload to Base64
        const bufferObj = Buffer.from(JSON.stringify(payload), "utf8");
        const base64EncodedPayload = bufferObj.toString("base64");

        // 3. Create X-VERIFY Checksum
        // Formula: SHA256(base64Payload + "/pg/v1/pay" + saltKey) + "###" + saltIndex
        const stringToHash = base64EncodedPayload + "/pg/v1/pay" + SALT_KEY;
        const sha256 = crypto.createHash('sha256').update(stringToHash).digest('hex');
        const xVerify = sha256 + "###" + SALT_INDEX;

        // 4. Call PhonePe API
        const options = {
            method: 'post',
            url: `${PHONEPE_HOST_URL}/pg/v1/pay`,
            headers: {
                'Content-Type': 'application/json',
                'X-VERIFY': xVerify
            },
            data: {
                request: base64EncodedPayload
            }
        };

        const response = await axios(options);
        const redirectUrl = response.data.data.instrumentResponse.redirectInfo.url;

        // 5. Send the Redirect URL back to Frontend
        res.json({ url: redirectUrl, orderId: orderId });

    } catch (error) {
        console.error("Payment Error:", error.response ? error.response.data : error.message);
        res.status(500).json({
            error: "Payment Failed",
            details: error.response ? error.response.data : error.message
        });
    }
});

// This is where PhonePe redirects the user after payment (Success or Failure)
app.post('/api/status/:orderId', async (req, res) => {
    const { orderId } = req.params;
    const merchantId = MERCHANT_ID;
    const saltKey = SALT_KEY;
    const saltIndex = SALT_INDEX;

    // In a real app, you would check the status from PhonePe S2S (Server to Server) here
    // For now, we just redirect the user back to your React App

    // Check Status API (Optional but recommended)
    // const stringToHash = `/pg/v1/status/${merchantId}/${orderId}` + saltKey;
    // const sha256 = crypto.createHash('sha256').update(stringToHash).digest('hex');
    // const xVerify = sha256 + "###" + saltIndex;

    // For the demo, we assume success and redirect to Frontend Success Page
    // You might want to pass success/failure query params
    res.redirect(`${CLIENT_URL}/menu?status=success&orderId=${orderId}`);
});

const PORT = 5000;
app.listen(PORT, () => {
    console.log(`Hostel Backend running on port ${PORT}`);
});
