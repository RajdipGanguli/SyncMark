import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyD-DUMMY-API-KEY",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "syncmark-demo.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "syncmark-demo",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "syncmark-demo.appspot.com",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "100000000000",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:100000000000:web:abcdef123456",
};

const app = initializeApp(firebaseConfig);
export const firestore = getFirestore(app);