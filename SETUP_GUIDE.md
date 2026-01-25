# 🚀 Hostel App: Go Live Guide

To make this application fully functional, you need to set up the backend services (Firebase) and payment gateway (Razorpay). Follow these steps:

## Phase 1: Firebase Setup (Database & Login)

1.  **Create a Project**:
    *   Go to [Firebase Console](https://console.firebase.google.com/).
    *   Click "Add project" -> Name it `hostel-bites`.
    *   Disable Google Analytics (not needed for now).

2.  **Enable Authentication**:
    *   Go to **Build** -> **Authentication** -> **Get Started**.
    *   Select **Phone** sign-in provider -> Enable it.
    *   (Optional) Add a dummy phone number for testing: `+91 9999999999` and code `123456`.

3.  **Enable Firestore (Database)**:
    *   Go to **Build** -> **Firestore Database** -> **Create Database**.
    *   Choose a location (e.g., `asia-south1` for Mumbai).
    *   **Rules**: Start in **Test Mode** (allows read/write for 30 days).

4.  **Enable Storage (Images)**:
    *   Go to **Build** -> **Storage** -> **Get Started**.
    *   Start in **Test Mode**.

5.  **Get Configuration**:
    *   Click the **Gear Icon** (Project Settings).
    *   Scroll down to "Your apps" -> Click the **</>** (Web) icon.
    *   Register app "Hostel Web".
    *   **COPY the `firebaseConfig` object**.
    *   Open your local file `src/lib/firebase.js` and replace the placeholder with this code.

## Phase 2: Razorpay Setup (Payments)

1.  **Create Account**:
    *   Go to [Razorpay](https://razorpay.com/) and Sign Up.
    *   Switch to **Test Mode** (toggle in dashboard).
2.  **Get Key ID**:
    *   Go to Settings -> API Keys -> Generate Key.
    *   Copy the `Key ID`.
    *   Open `src/pages/UserMenu.jsx` and replace `"YOUR_RAZORPAY_KEY"` with this ID.

## Phase 3: Hosting (Deploy to Internet)

1.  **Netlify (Easiest)**:
    *   Push your code to GitHub.
    *   Log in to Netlify -> "Add new site" -> "Import from GitHub".
    *   Select your repo.
    *   Build command: `npm run build`.
    *   Publish directory: `dist`.
    *   Click **Deploy**.

---

## IMPORTANT: Code Updates
I have updated your code to automatically switch from "Mock Data" to "Real Firebase Data" once you paste your keys!

**Next Steps for You:**
1. Follow Phase 1 above to get the keys.
2. Paste them into `src/lib/firebase.js`.
3. Restart the server (`npm run dev`).
4. The app will be empty initially! Login as Admin and add some items to populate the database.
