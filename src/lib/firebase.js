import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
    apiKey: "AIzaSyDvXT8SxAB_uwfaaMtRJreECrpn8tDjTKs",
    authDomain: "hostel-bites-619ab.firebaseapp.com",
    projectId: "hostel-bites-619ab",
    storageBucket: "hostel-bites-619ab.firebasestorage.app",
    messagingSenderId: "520536540012",
    appId: "1:520536540012:web:62bcd774186c06da1ce949",
    measurementId: "G-FHVS4249PG"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
