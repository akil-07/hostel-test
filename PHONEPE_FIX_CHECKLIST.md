# PhonePe Integration - Final Setup Checklist

## ✅ Step-by-Step Fix for KEY_NOT_CONFIGURED Error

### 1. Update Render Environment Variables

Go to: https://dashboard.render.com → Your Backend Service → Environment Tab

**DELETE these variables if they exist:**
- Any variable with "MERCHANT" in the name (except MERCHANT_ID)
- Any variable with "SALT" in the name (except SALT_KEY and SALT_INDEX)

**SET these variables to EXACT values:**

```
MERCHANT_ID=PGTESTPAYUAT
SALT_KEY=099eb0cd-02cf-4e2a-8aca-3e6c6aff0399
SALT_INDEX=1
PHONEPE_HOST_URL=https://api-preprod.phonepe.com/apis/pg-sandbox
APP_BE_URL=https://hostel-application-jv4m.onrender.com
APP_FE_URL=https://hostel-application-omega.vercel.app
VAPID_PUBLIC_KEY=BMYSOMGKprBtk2xcJW1GkG5y7albujHbIFdgCEK2IA4--YsF2NjTCc54u_hWA0ftAsMUY7s4P8m61K6IZbXP1fU
VAPID_PRIVATE_KEY=yYGWAWl-QdH1l9qR9Fa6Ig6jxu8v6rxgJNeknmf5ppA
EMAIL_CONTACT=test@example.com
```

**IMPORTANT:** Click "Save Changes" button!

### 2. Wait for Deployment

- Render will automatically redeploy (1-2 minutes)
- Watch the "Logs" tab in Render
- Look for this output:
  ```
  ========== PHONEPE CONFIGURATION ==========
  Merchant ID: PGTESTPAYUAT
  Salt Index: 1
  PhonePe URL: https://api-preprod.phonepe.com/apis/pg-sandbox
  Backend URL: https://hostel-application-jv4m.onrender.com
  Frontend URL: https://hostel-application-omega.vercel.app
  ==========================================
  ```

### 3. Test the Payment Flow

1. **Open your live site:** https://hostel-application-omega.vercel.app
2. **Login** as a student
3. **Add items** to cart
4. **Click "Place Order"** and fill in delivery details
5. **Click "Place Order"** button
6. **You should be redirected to PhonePe Simulator**
7. **Complete the test payment** (use any test card details)
8. **You should be redirected back** to `/payment-success` page

### 4. Common Issues & Solutions

#### Issue: Still getting KEY_NOT_CONFIGURED
**Solution:** 
- Check Render logs to verify configuration
- Make sure you clicked "Save Changes" in Render
- Wait for full redeploy (check Logs tab for "Hostel Backend running")

#### Issue: "Failed to fetch" error
**Solution:**
- This means frontend can't reach backend
- Verify `VITE_API_URL` is NOT set in Vercel (we use automatic detection now)
- Check browser console for actual error

#### Issue: Payment succeeds but doesn't redirect back
**Solution:**
- Check that `APP_FE_URL` is set correctly in Render
- Verify the redirect URL in PhonePe logs

### 5. Verify Configuration

After deployment, you can verify the configuration by:

1. **Check Render Logs:**
   - Go to Render Dashboard → Logs tab
   - Look for the "PHONEPE CONFIGURATION" section
   - Verify all values are correct

2. **Test Backend Directly:**
   - Open: https://hostel-application-jv4m.onrender.com/
   - You should see: "Server is running"

3. **Check Frontend Connection:**
   - Open your live site
   - Open browser DevTools (F12)
   - Go to Console tab
   - Look for any errors

## 🎯 Expected Flow

1. User clicks "Place Order" → Frontend calls `/api/pay`
2. Backend creates PhonePe payment → Returns redirect URL
3. User is redirected to PhonePe Simulator
4. User completes payment → PhonePe redirects to `/payment-success?id=ORDER_xxx`
5. Frontend calls `/api/status/ORDER_xxx` to verify
6. If successful → Order is saved to Firestore
7. User sees success page

## 📝 Notes

- **Test Mode:** Uses `PGTESTPAYUAT` merchant ID
- **Sandbox URL:** `https://api-preprod.phonepe.com/apis/pg-sandbox`
- **No real money:** All transactions are simulated
- **Test Cards:** Any card number works in simulator

## 🚀 Moving to Production (Future)

When you're ready to accept real payments:
1. Register for PhonePe merchant account
2. Get production credentials
3. Update environment variables with production values
4. Change `PHONEPE_HOST_URL` to production endpoint
5. Test thoroughly before going live!
