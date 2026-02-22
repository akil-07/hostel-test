import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
    apiKey: "AIzaSyAxM7WNpI3sHnm69eem8hsvjdyJZ4vQUdM",
    authDomain: "minutes-store.firebaseapp.com",
    projectId: "minutes-store",
    storageBucket: "minutes-store.firebasestorage.app",
    messagingSenderId: "844469005214",
    appId: "1:844469005214:web:14d8e8307c7846100cc48f",
    measurementId: "G-MPM5C3R8T2"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
