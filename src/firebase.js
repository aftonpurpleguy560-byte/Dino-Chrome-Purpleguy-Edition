import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAAzJOlmCeigqjfPDAo68alda1QOVM4Cec",
  authDomain: "purpleguy-chromedino-b69a7.firebaseapp.com",
  projectId: "purpleguy-chromedino-b69a7",
  storageBucket: "purpleguy-chromedino-b69a7.firebasestorage.app",
  messagingSenderId: "697122629403",
  appId: "1:697122629403:web:181cef564f7386448315be"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app); // Oyunun veritabanına bağlanması için bu şart
