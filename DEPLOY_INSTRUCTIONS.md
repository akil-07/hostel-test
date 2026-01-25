# 🚀 Hosting Your Hostel App

Since your app uses **Firebase** and **Razorpay**, we need to set it up correctly on a hosting provider. I recommend **Vercel** because it's the easiest and fastest.

---

## ✅ Step 1: Prepare the Code (Done!)
I have already:
1. Tested the build (it works!).
2. Added `vercel.json` (so refreshing pages doesn't break the app).
3. Added `_redirects` (just in case you choose Netlify instead).

---

## 🌐 Step 2: Deploy to Vercel (Recommended)

1.  **Create an Account**: Go to [vercel.com](https://vercel.com/) and sign up (GitHub login is best).
2.  **Install Vercel CLI** (Optional but easier):
    *   Open your terminal here in VS Code.
    *   Run: `npm install -g vercel`
    *   Run: `vercel login` (follow the email steps).
    *   Run: `vercel` (inside this project folder).
    
    **OR (Drag & Drop Method - Easier):**
    1.  Go to your Desktop folder: `HOSTEL-APP`.
    2.  Delete the `node_modules` folder (it's huge and we don't need to upload it).
    3.  Go to [vercel.com/new](https://vercel.com/new).
    4.  Import this project (if it's on GitHub) OR upload the folder manually.

3.  **Environment Variables (CRITICAL)**:
    *   When Vercel asks for "Environment Variables", you MUST add this:
    *   **Name**: `VITE_RAZORPAY_KEY_ID`
    *   **Value**: `rzp_test_...` (Copy this from your local `.env` file).
    *   *Note: Firebase keys are public-safe usually, but if you want to be extra safe, you can add them too, but currently they are hardcoded in `firebase.js`. That is fine for this project level.*

4.  **Click Deploy!** 🚀
    *   Vercel will give you a link like `https://hostel-app-xyz.vercel.app`.

---

## ⚡ Step 3: Update Razorpay & Firebase

Once you have your **LIVE LINK** (e.g., `https://hostel-app.vercel.app`), you need to tell Razorpay and Firebase that this website is safe.

1.  **Firebase Authentication**:
    *   Go to **Firebase Console** -> **Authentication** -> **Settings** -> **Authorized Domains**.
    *   Click "Add Domain".
    *   Paste your new Vercel link (without `https://`).
    *   *If you don't do this, OTP Login will fail on the live site!*

2.  **Razorpay**:
    *   Your Test keys work on localhost and live sites, so no changes needed usually.
    *   When you switch to **Live Mode** (Real Money) later, you will need to add the website link in Razorpay Dashboard.

---

## 🚧 Common Issues

*   **"Page Not Found" on Refresh**: I fixed this with `vercel.json`.
*   **OTP Not Sending**: You forgot Step 3 (Firebase Authorized Domains).
*   **Payment Failed**: Check if `VITE_RAZORPAY_KEY_ID` is added in Vercel Settings.

---

**Ready to launch!** 🚀
