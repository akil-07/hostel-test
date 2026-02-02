# 🚀 Deploying the Backend (Required for Payments)

Your app sends payment requests to a **Backend Server**. While Vercel hosts your frontend (the visual part), it typically doesn't run the backend logic (Node.js server) unless configured as Serverless functions.

To make payments work, you need to host the `backend` folder on a service that runs Node.js. **Render.com** is a great free option.

---

## ✅ Step 1: Push Code to GitHub
Ensure your latest code (including the `backend` folder) is pushed to your GitHub repository.

## 🌐 Step 2: Deploy to Render.com
1.  **Sign Up**: Go to [render.com](https://render.com/) and sign up with GitHub.
2.  **New Web Service**: Click **"New +"** -> **"Web Service"**.
3.  **Connect Repo**: Select your `HOSTEL-APP` repository.
4.  **Configure Settings**:
    *   **Name**: `hostel-backend` (or similar)
    *   **Root Directory**: `backend` (Important! This tells Render to look in the backend folder)
    *   **Runtime**: Node
    *   **Build Command**: `npm install`
    *   **Start Command**: `node server.js`
5.  **Environment Variables**:
    *   Scroll down to "Environment Variables". You MUST add the keys from your `backend/.env` file:
        *   `MERCHANT_ID`: (Your PhonePe Merchant ID)
        *   `SALT_KEY`: (Your PhonePe Salt Key)
        *   `SALT_INDEX`: `1`
        *   `VAPID_PUBLIC_KEY`: (From your local env)
        *   `VAPID_PRIVATE_KEY`: (From your local env)
        *   `EMAIL_CONTACT`: `your-email@example.com`

6.  **Deploy**: Click **Create Web Service**.
    *   Wait for it to say "Live".
    *   Copy the URL (e.g., `https://hostel-backend-xyz.onrender.com`).

---

## 🔗 Step 3: Connect Frontend to Backend (Vercel)
Now that your backend is live, tell your Vercel frontend where to find it.

1.  Go to your **Vercel Project Dashboard**.
2.  Click **Settings** -> **Environment Variables**.
3.  Add a new Variable:
    *   **Key**: `VITE_API_URL`
    *   **Value**: Your Render Backend URL (e.g., `https://hostel-backend-xyz.onrender.com`) - *Do not add a trailing slash `/`*
4.  **Redeploy**: Go to **Deployments**, click the three dots on the latest one, and click **Redeploy** (so it picks up the new variable).

---

## 🎉 Done!
Now your live Vercel app will talk to your live Render backend, and payments will work!
