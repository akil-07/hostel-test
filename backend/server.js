const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
const axios = require('axios');
const app = express();

app.use(cors());
app.use(express.json());

// Basic Server Setup
app.get('/', (req, res) => {
    res.send('Server is running');
});

const PORT = 5000;

// CONSTANTS
// SWITCHING TO PGTESTPAYUAT86 (More reliable than PGTESTPAYUAT)
const MERCHANT_ID = "PGTESTPAYUAT86";
const SALT_KEY = "96434309-7796-489d-8924-ab56988a6076";
const SALT_INDEX = 1;

// SANDBOX URL
const PHONEPE_HOST_URL = "https://api-preprod.phonepe.com/apis/pg-sandbox";

// APP URLs - Use Environment Variables in Production (Render/Vercel)
// For Mobile Testing: Use your PC's Local IP (Check via 'ipconfig')
const APP_BE_URL = process.env.APP_BE_URL || "http://localhost:5000";
const APP_FE_URL = process.env.APP_FE_URL || "http://localhost:5173";

app.post('/api/pay', async (req, res) => {
    try {
        const { amount, userId, orderId } = req.body;

        if (!amount || !userId || !orderId) {
            return res.status(400).json({ error: "Missing required fields" });
        }

        // 1. Create Payload
        // DYNAMICALLY DETERMINE FRONTEND URL FROM REQUEST ORIGIN
        const clientOrigin = req.headers.origin || "http://localhost:5173";
        const backendUrl = process.env.APP_BE_URL || `http://${req.hostname}:5000`; // Best guess for backend

        const payload = {
            merchantId: MERCHANT_ID,
            merchantTransactionId: orderId,
            merchantUserId: userId,
            amount: amount * 100, // Amount in paise
            redirectUrl: `${clientOrigin}/payment-success?id=${orderId}`,
            redirectMode: "REDIRECT",
            callbackUrl: `${backendUrl}/api/callback`,
            paymentInstrument: {
                type: "PAY_PAGE"
            }
        };

        const bufferObj = Buffer.from(JSON.stringify(payload), "utf8");
        const base64EncodedPayload = bufferObj.toString("base64");

        // 2. Compute Checksum (X-VERIFY Header)
        const stringToHash = base64EncodedPayload + "/pg/v1/pay" + SALT_KEY;
        const sha256 = crypto.createHash('sha256').update(stringToHash).digest('hex');
        const xVerify = sha256 + "###" + SALT_INDEX;

        console.log("--- DEBUG PHOPE PE REQUEST ---");
        console.log("Payload:", JSON.stringify(payload));
        console.log("X-VERIFY:", xVerify);
        console.log("URL:", `${PHONEPE_HOST_URL}/pg/v1/pay`);
        console.log("------------------------------");

        // 3. Send Request to PhonePe
        const response = await axios.post(`${PHONEPE_HOST_URL}/pg/v1/pay`, {
            request: base64EncodedPayload
        }, {
            headers: {
                'Content-Type': 'application/json',
                'X-VERIFY': xVerify,
                'accept': 'application/json'
            }
        });

        // 4. Send Redirect URL to Frontend
        const redirectUrl = response.data.data.instrumentResponse.redirectInfo.url;
        res.json({ url: redirectUrl });

    } catch (error) {
        console.error("Payment Error:", error.response ? error.response.data : error.message);
        res.status(500).json({
            error: "Payment initiation failed",
            details: error.response ? error.response.data : error.message
        });
    }
});

// Optional: Callback endpoint for Server-to-Server updates
app.post('/api/callback', (req, res) => {
    console.log("Payment Callback Received:", req.body);
    // Here you would verify the checksum again and update the database
    res.send("Callback Received");
});

// 5. Payment Status Check API
app.get('/api/status/:orderId', async (req, res) => {
    const { orderId } = req.params;

    const stringToHash = `/pg/v1/status/${MERCHANT_ID}/${orderId}` + SALT_KEY;
    const sha256 = crypto.createHash('sha256').update(stringToHash).digest('hex');
    const xVerify = sha256 + "###" + SALT_INDEX;

    try {
        const response = await axios.get(`${PHONEPE_HOST_URL}/pg/v1/status/${MERCHANT_ID}/${orderId}`, {
            headers: {
                'Content-Type': 'application/json',
                'X-VERIFY': xVerify,
                'X-MERCHANT-ID': MERCHANT_ID,
                'accept': 'application/json'
            }
        });

        res.json(response.data);

    } catch (error) {
        console.error("Status Check Error:", error.response ? error.response.data : error.message);
        res.status(500).json({
            error: "Failed to fetch status",
            details: error.response ? error.response.data : error.message
        });
    }
});

app.listen(PORT, () => {
    console.log(`Hostel Backend running on port ${PORT}`);
});
