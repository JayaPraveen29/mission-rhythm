// firebase.js
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBj-6Y_eJMWT5Y3LGbm3VWSte12MsBMaG4",
  authDomain: "mission-rythm.firebaseapp.com",
  projectId: "mission-rythm",
  storageBucket: "mission-rythm.firebasestorage.app",
  messagingSenderId: "915569691126",
  appId: "1:915569691126:web:767762eb828943675c1fd7",
  measurementId: "G-02XJR7XJHC",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// These two exports are what the rest of the app needs
export const auth = getAuth(app);
export const db = getFirestore(app);
export default app;
