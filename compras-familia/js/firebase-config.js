// Configuração do Firebase
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyAoNnoRS4qKDNEUU4VEzHmC93ca14ZJjYs",
  authDomain: "compras-em-familia-1c550.firebaseapp.com",
  projectId: "compras-em-familia-1c550",
  storageBucket: "compras-em-familia-1c550.firebasestorage.app",
  messagingSenderId: "765875237924",
  appId: "1:765875237924:web:3255c4a66ec9d87b11d4b1"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
