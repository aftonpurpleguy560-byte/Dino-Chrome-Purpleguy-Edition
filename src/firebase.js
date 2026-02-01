import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAK61xyYFKoo19X0jDUIj378QMq2G13Ohs",
  authDomain: "dino-chrome-purpleguy-edition.firebaseapp.com",
  projectId: "dino-chrome-purpleguy-edition",
  storageBucket: "dino-chrome-purpleguy-edition.firebasestorage.app",
  messagingSenderId: "978217939718",
  appId: "1:978217939718:web:00641130234a2db510a487"
};

// Firebase'i başlat
const app = initializeApp(firebaseConfig);

// Veritabanını (Firestore) dışa aktar ki DinoGame.jsx kullanabilsin
export const db = getFirestore(app);

