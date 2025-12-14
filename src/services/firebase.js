// src/services/firebase.js
import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";
import { getAuth } from "firebase/auth";

// ------------------ Firebase Config ------------------
const firebaseConfig = {
  apiKey: "AIzaSyClQa_qgauMNO0BkrrE8RId_8PbaahHVMM",
  authDomain: "farm-feeds-maintenance.firebaseapp.com",
  databaseURL: "https://farm-feeds-maintenance-default-rtdb.firebaseio.com",
  projectId: "farm-feeds-maintenance",
  storageBucket: "farm-feeds-maintenance.appspot.com", // fixed
  messagingSenderId: "297888806058",
  appId: "1:297888806058:web:c4ac4c10585519245c8cd3",
  // measurementId is optional, remove if not using Analytics
};

// ------------------ Initialize Firebase ------------------
const app = initializeApp(firebaseConfig);

// Export database instance
export const db = getDatabase(app);

// Export Auth instance (optional)
export const auth = getAuth(app);
