const getBackendUrl = () => {
    // 1. If VITE_API_URL is explicitly defined in .env, use it (Top Priority)
    if (import.meta.env.VITE_API_URL) {
        return import.meta.env.VITE_API_URL;
    }

    // 2. If running on localhost, default to local backend
    // This allows local development to work out of the box
    const hostname = window.location.hostname;
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
        return 'http://localhost:5000';
    }

    // 3. Fallback for Production (Render, Vercel, etc.)
    // If VITE_API_URL is missing in production, we fallback to the known Render Backend URL.
    return 'https://hostel-application-jv4m.onrender.com';
};

export const API_URL = getBackendUrl();
