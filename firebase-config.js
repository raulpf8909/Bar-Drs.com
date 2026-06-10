import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getAuth, GoogleAuthProvider } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-storage.js";

const firebaseConfig = {
  apiKey: "AIzaSyCPkfsrWoSkF7oYE_QAKkjJ5oYLzsXynao",
  authDomain: "bardrs-64b37.firebaseapp.com",
  projectId: "bardrs-64b37",
  storageBucket: "bardrs-64b37.firebasestorage.app",
  messagingSenderId: "437026154305",
  appId: "1:437026154305:web:7ef5635e69acfa95a623c0",
  measurementId: "G-PXEQ13C50F"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();
const storage = getStorage(app);

export { auth, provider, storage };
