import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import {
  getAuth,
  onAuthStateChanged,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  GithubAuthProvider,
  signOut as firebaseSignOut,
  updateProfile
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';

const firebaseConfig = {
  apiKey: "AIzaSyBN64PEinjJ9bTb-vi4ziHm3giN0gYAdnk",
  authDomain: "ani-ai-2151d.firebaseapp.com",
  projectId: "ani-ai-2151d",
  storageBucket: "ani-ai-2151d.firebasestorage.app",
  messagingSenderId: "941177544986",
  appId: "1:941177544986:web:8e87be4cba03a2bf834ca3",
  measurementId: "G-2RK6M9T0NE"
};

const app  = initializeApp(firebaseConfig);
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();
const githubProvider = new GithubAuthProvider();

export async function signInWithGoogle() {
  return signInWithPopup(auth, googleProvider);
}

export async function signInWithGitHub() {
  return signInWithPopup(auth, githubProvider);
}

export async function signInWithEmail(email, password) {
  return signInWithEmailAndPassword(auth, email, password);
}

export async function signUpWithEmail(email, password, displayName) {
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  if (displayName) await updateProfile(cred.user, { displayName });
  return cred;
}

export async function signOut() {
  return firebaseSignOut(auth);
}

export function onAuthChange(callback) {
  onAuthStateChanged(auth, callback);
}

export async function getIdToken() {
  const user = auth.currentUser;
  if (!user) return null;
  return user.getIdToken();
}
