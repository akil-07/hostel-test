require('dotenv').config();
const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
const axios = require('axios');
const webpush = require('web-push');
const fs = require('fs');
const path = require('path');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { body, validationResult } = require('express-validator');

const app = express();

// Security Headers
app.use(helmet());

// Cross-Origin Resource Sharing
app.use(cors());

// Global Rate Limiter
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
    message: { error: 'Too many requests, please try again later.' }
});

// Apply rate limiting to all requests
app.use(limiter);

app.use(express.json({ limit: '10kb' })); // Body parser with size limit to prevent DoS

// VAPID Keys
const publicVapidKey = process.env.VAPID_PUBLIC_KEY;
const privateVapidKey = process.env.VAPID_PRIVATE_KEY;

if (!publicVapidKey || !privateVapidKey) {
    console.error("FATAL: VAPID Keys are missing in environment variables.");
    process.exit(1);
}

webpush.setVapidDetails(
    `mailto:${process.env.EMAIL_CONTACT || 'admin@example.com'}`,
    publicVapidKey,
    privateVapidKey
);

// Subscription Storage (Simple JSON file)
const SUBSCRIPTION_FILE = path.join(__dirname, 'subscriptions.json');

const getSubscriptions = () => {
    if (!fs.existsSync(SUBSCRIPTION_FILE)) return [];
    return JSON.parse(fs.readFileSync(SUBSCRIPTION_FILE));
};

const saveSubscription = (subscriptionData) => {
    // Expected: { subscription: {...}, userId: '...' }
    const subs = getSubscriptions();
    // Use endpoint as unique key
    const existingIndex = subs.findIndex(s => s.subscription.endpoint === subscriptionData.subscription.endpoint);

    if (existingIndex >= 0) {
        subs[existingIndex] = subscriptionData; // Update metadata if any
    } else {
        subs.push(subscriptionData);
    }
    fs.writeFileSync(SUBSCRIPTION_FILE, JSON.stringify(subs));
};

const removeSubscription = (endpoint) => {
    const subs = getSubscriptions();
    const newSubs = subs.filter(s => s.subscription.endpoint !== endpoint);
    fs.writeFileSync(SUBSCRIPTION_FILE, JSON.stringify(newSubs));
}

// Basic Server Setup
app.get('/', (req, res) => {
    res.send('Server is running');
});

const PORT = 5000;

// CONSTANTS
// CONSTANTS - DEBUG: Force Standard Test Credentials
const MERCHANT_ID = "PGTESTPAYUAT";
const SALT_KEY = "099eb0cd-02cf-4e2a-8aca-3e6c6aff0399";
const SALT_INDEX = 1;

// SANDBOX URL
const PHONEPE_HOST_URL = process.env.PHONEPE_HOST_URL || "https://api-preprod.phonepe.com/apis/pg-sandbox";

// APP URLs - Use Environment Variables in Production (Render/Vercel)
// For Mobile Testing: Use your PC's Local IP (Check via 'ipconfig')
const APP_BE_URL = process.env.APP_BE_URL || "http://localhost:5000";
const APP_FE_URL = process.env.APP_FE_URL || "http://localhost:5173";

const validatePayment = [
    body('amount').isFloat({ min: 1 }).withMessage('Amount must be at least 1'),
    body('userId').trim().notEmpty().withMessage('User ID is required').isLength({ max: 100 }),
    body('orderId').trim().notEmpty().withMessage('Order ID is required').matches(/^[a-zA-Z0-9-_]+$/).withMessage('Order ID must be alphanumeric, hyphen, or underscore')
];

app.post('/api/pay', validatePayment, async (req, res) => {
    // Check validation results
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    try {
        const { amount, userId, orderId } = req.body;

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


// Notification Endpoints
app.get('/api/vapid-public-key', (req, res) => {
    res.json({ publicKey: publicVapidKey });
});

app.post('/api/subscribe', [
    body('subscription').isObject().withMessage('Subscription must be an object'),
    body('subscription.endpoint').isURL().withMessage('Endpoint must be a valid URL'),
    body('userId').optional().trim().escape()
], (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }
    const subscription = req.body;
    saveSubscription(subscription);
    res.status(201).json({});
});

app.post('/api/send-notification', [
    body('title').trim().notEmpty().escape().isLength({ max: 50 }),
    body('message').trim().notEmpty().escape().isLength({ max: 200 })
], (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    // Broadcast to all
    const { title, message } = req.body;
    const payload = JSON.stringify({ title, body: message });
    const subscriptions = getSubscriptions();

    Promise.all(subscriptions.map(subData => {
        return webpush.sendNotification(subData.subscription, payload)
            .catch(err => {
                console.error("Error sending notification", err);
                if (err.statusCode === 410 || err.statusCode === 404) {
                    removeSubscription(subData.subscription.endpoint);
                }
            });
    }))
        .then(() => res.json({ success: true }))
        .catch(err => {
            console.error("Error sending notifications", err);
            res.sendStatus(500);
        });
});

app.post('/api/send-user-notification', [
    body('userId').trim().notEmpty(),
    body('title').trim().notEmpty().escape().isLength({ max: 50 }),
    body('message').trim().notEmpty().escape().isLength({ max: 200 })
], (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { userId, title, message } = req.body;
    if (!userId) return res.status(400).json({ error: "No User ID Provided" });

    const payload = JSON.stringify({ title, body: message });
    const subscriptions = getSubscriptions();

    // Filter by userId (phone number)
    const userSubs = subscriptions.filter(s => s.userId === userId);

    if (userSubs.length === 0) {
        return res.status(200).json({ message: "No active subscriptions for this user" });
    }

    Promise.all(userSubs.map(subData => {
        return webpush.sendNotification(subData.subscription, payload)
            .catch(err => {
                if (err.statusCode === 410 || err.statusCode === 404) {
                    removeSubscription(subData.subscription.endpoint);
                }
            });
    }))
        .then(() => res.json({ success: true }))
        .catch(err => res.sendStatus(500));
});

app.listen(PORT, () => {
    console.log(`Hostel Backend running on port ${PORT}`);
});
