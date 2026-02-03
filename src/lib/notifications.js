
import { API_URL } from '../config';

const urlBase64ToUint8Array = (base64String) => {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
        .replace(/\-/g, '+')
        .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
};

export const subscribeToNotifications = async () => {
    if (!('serviceWorker' in navigator)) {
        throw new Error('Service Worker not supported');
    }

    if (!('PushManager' in window)) {
        throw new Error('Push Notifications not supported');
    }

    // 1. Register Service Worker
    const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/'
    });

    // 2. Get Public VAPID Key from Backend
    const response = await fetch(`${API_URL}/api/vapid-public-key`);
    const data = await response.json();
    const publicVapidKey = data.publicKey;

    // 3. Subscribe
    const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicVapidKey)
    });

    // 4. Send Subscription to Backend
    // Use stored user profile to get phone number if possible, or pass it in
    const userProfile = JSON.parse(localStorage.getItem('hostel_user_profile') || '{}');
    const userPhone = userProfile.phone || 'unknown';

    await fetch(`${API_URL}/api/subscribe`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ subscription, userId: userPhone })
    });

    return subscription;
};
