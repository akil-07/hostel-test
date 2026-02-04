# 🧪 LOCAL PAYMENT TESTING GUIDE

## ✅ Backend Status
- ✅ Backend is running on http://localhost:5000
- ✅ Frontend is running on http://localhost:5173
- ✅ Payment endpoint tested successfully (got PhonePe redirect URL)

## 📋 Step-by-Step Testing Instructions

### 1. Open the Application
Open your browser and go to: **http://localhost:5173**

### 2. Login
- If you're not logged in, use any test student credentials
- Or create a new account if needed

### 3. Add Items to Cart
- Navigate to the menu page
- Click "Add to Cart" on any items you want to order
- You should see the cart count increase

### 4. Go to Checkout
- Click the "Checkout" button (usually at the bottom of the page)
- You'll see a checkout form

### 5. Fill in Delivery Details
Fill in the form with:
- **Name:** Your name
- **Room Number:** e.g., "A-302"
- **Hostel Block:** Select from dropdown
- **Phone:** Your phone number
- **Time:** Select delivery time
- **Notes:** (Optional) Any special requests

### 6. Place Order
- Click the **"Place Order"** button
- The app will call the backend to initiate payment

### 7. Expected Result ✅
You should be **redirected to the PhonePe Simulator** page!

The URL will look like:
```
https://mercury-uat.phonepe.com/transact/simulator?token=...
```

### 8. Complete Test Payment
On the PhonePe simulator:
1. You'll see a test payment interface
2. Click "Success" to simulate successful payment
3. You'll be redirected back to: **http://localhost:5173/payment-success?id=ORDER_xxx**

### 9. Verify Order
- The payment success page should show "Payment Successful!"
- Your order should be saved to Firestore
- You can check your orders in the "My Orders" section

## 🔍 What to Check

### ✅ Success Indicators:
- [ ] Cart items display correctly
- [ ] Checkout form opens
- [ ] "Place Order" button works
- [ ] **Redirected to PhonePe simulator** (most important!)
- [ ] Can complete test payment
- [ ] Redirected back to success page
- [ ] Order appears in "My Orders"

### ❌ If You See Errors:

**Error: "Failed to fetch"**
- Check browser console (F12 → Console tab)
- Backend might not be running
- Check that backend is on http://localhost:5000

**Error: "Payment Failed: KEY_NOT_CONFIGURED"**
- This shouldn't happen anymore with new credentials
- If it does, check backend logs

**Error: "Payment initiation failed"**
- Check backend terminal for error details
- Look for the "DEBUG PHONEPE REQUEST" section

## 📊 Backend Logs to Watch

In your backend terminal, you should see:

```
--- DEBUG PHONEPE REQUEST ---
Using Merchant ID: PGTESTPAYUAT86
Payload: {"merchantId":"PGTESTPAYUAT86",...}
X-VERIFY: [hash]###1
URL: https://api-preprod.phonepe.com/apis/pg-sandbox/pg/v1/pay
------------------------------
```

If the request succeeds, you won't see any error messages.

## 🎯 Expected Flow

```
User clicks "Place Order"
    ↓
Frontend calls: POST http://localhost:5000/api/pay
    ↓
Backend creates PhonePe payment request
    ↓
PhonePe returns redirect URL
    ↓
User redirected to: https://mercury-uat.phonepe.com/...
    ↓
User completes test payment (clicks "Success")
    ↓
PhonePe redirects to: http://localhost:5173/payment-success?id=ORDER_xxx
    ↓
Frontend verifies payment status
    ↓
Order saved to Firestore
    ↓
Success page displayed!
```

## 🐛 Troubleshooting

### If payment doesn't work:

1. **Check Backend Logs**
   - Look for errors in the terminal running `node server.js`
   - Check the "DEBUG PHONEPE REQUEST" output

2. **Check Frontend Console**
   - Press F12 in browser
   - Go to Console tab
   - Look for any red error messages

3. **Check Network Tab**
   - Press F12 → Network tab
   - Click "Place Order"
   - Look for the `/api/pay` request
   - Check if it returns 200 or an error

4. **Verify Configuration**
   - Backend should show: `Merchant ID: PGTESTPAYUAT86`
   - PhonePe URL should be: `https://api-preprod.phonepe.com/apis/pg-sandbox`

## ✅ Success Criteria

The test is successful if:
1. ✅ You get redirected to PhonePe simulator
2. ✅ You can complete the test payment
3. ✅ You get redirected back to success page
4. ✅ Order is saved and visible in "My Orders"

---

**Ready to test?** Open http://localhost:5173 and follow the steps above!

If you encounter any issues, let me know what error message you see and I'll help fix it.
