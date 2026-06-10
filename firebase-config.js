import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getAuth, GoogleAuthProvider } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { initializeFirestore } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-storage.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-analytics.js";

// Initialize Firestore with long‑polling to work on restricted networks
// Firestore will be initialized after the Firebase app is created.

// Configuración de tu proyecto Firebase
const firebaseConfig = {
  apiKey: "AIzaSyCPkfsrWoSkF7oYE_QAKkjJ5oYLzsXynao",
  authDomain: "bardrs-64b37.firebaseapp.com",
  projectId: "bardrs-64b37",
  storageBucket: "bardrs-64b37.firebasestorage.app",
  messagingSenderId: "437026154305",
  appId: "1:437026154305:web:7ef5635e69acfa95a623c0",
  measurementId: "G-PXEQ13C50F"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
try { getAnalytics(app); } catch (e) { /* analytics no disponible */ }
const db = initializeFirestore(app, { experimentalForceLongPolling: true });
// Initialize Firebase services
const auth = getAuth(app);
const provider = new GoogleAuthProvider();

const storage = getStorage(app);

export { auth, provider, db, storage };
