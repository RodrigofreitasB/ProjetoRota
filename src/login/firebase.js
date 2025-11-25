import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
    apiKey: "AIzaSyDCnwe-z2jQQ9HKXMXxMBR4bhz0VNXD5vA",
    authDomain: "projetorota-e8319.firebaseapp.com",
    projectId: "projetorota-e8319",
    storageBucket: "projetorota-e8319.firebasestorage.app",
    messagingSenderId: "419760509308",
    appId: "1:419760509308:web:21467f64bc5a19385c14f9"
};


const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);