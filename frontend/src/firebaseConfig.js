import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth"; // <--- Esta línea es la que te faltaba

const firebaseConfig = {
  apiKey: "AIzaSyCaXNgrlaBVK0Mfg3Fi2AxyKCmyVf rleH4",
  authDomain: "vibemarket-app.firebaseapp.com",
  projectId: "vibemarket-app",
  storageBucket: "vibemarket-app.firebasestorage.app",
  messagingSenderId: "378562609393",
  appId: "1:378562609393:web:63644edf3353418d49a950"
};

const app = initializeApp(firebaseConfig);

// Exportamos 'auth' para que App.js pueda crear los usuarios
export const auth = getAuth(app);