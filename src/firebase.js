import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCwdzsTXt8vFaWB7PaiJP6XObWcMsWZOEU",
  authDomain: "purpledino-efe.firebaseapp.com",
  projectId: "purpledino-efe",
  storageBucket: "purpledino-efe.firebasestorage.app",
  messagingSenderId: "98080359272",
  appId: "1:98080359272:web:049aa594e37b756af30cdd"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
