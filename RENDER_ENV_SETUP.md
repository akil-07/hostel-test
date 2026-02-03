# CRITICAL: Render Backend Environment Variables Setup

## Required Environment Variables for Render

Go to your Render Dashboard → hostel-application (Backend) → Environment tab and set these **EXACT** values:

### PhonePe Test Mode Configuration
```
MERCHANT_ID=PGTESTPAYUAT
SALT_KEY=099eb0cd-02cf-4e2a-8aca-3e6c6aff0399
SALT_INDEX=1
PHONEPE_HOST_URL=https://api-preprod.phonepe.com/apis/pg-sandbox
```

### Backend/Frontend URLs (CRITICAL!)
```
APP_BE_URL=https://hostel-application-jv4m.onrender.com
APP_FE_URL=https://hostel-application-omega.vercel.app
```

### VAPID Keys (for Push Notifications)
```
VAPID_PUBLIC_KEY=BMYSOMGKprBtk2xcJW1GkG5y7albujHbIFdgCEK2IA4--YsF2NjTCc54u_hWA0ftAsMUY7s4P8m61K6IZbXP1fU
VAPID_PRIVATE_KEY=yYGWAWl-QdH1l9qR9Fa6Ig6jxu8v6rxgJNeknmf5ppA
EMAIL_CONTACT=test@example.com
```

## Why This Matters

The `KEY_NOT_CONFIGURED` error happens when:
1. **Wrong Merchant ID**: Using production ID with sandbox URL or vice versa
2. **Wrong Callback URL**: PhonePe validates the callback URL against your merchant settings
3. **Missing APP_BE_URL**: If this is not set, the callback URL will be malformed

## After Setting Variables

1. Click "Save Changes" in Render
2. Wait for automatic redeploy (1-2 minutes)
3. Check the "Logs" tab - you should see:
   ```
   ⚠️ DETECTED TEST MERCHANT ID: Forcing Sandbox URL
   Hostel Backend running on port 5000
   ```

## Testing

After deployment, test the payment flow:
1. Go to your Vercel site
2. Add items to cart
3. Click "Place Order"
4. You should be redirected to PhonePe Simulator
5. Complete the test payment
6. You should be redirected back to `/payment-success`
