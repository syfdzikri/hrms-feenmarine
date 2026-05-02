import { getApps, initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getDatabase } from 'firebase/database';

const firebaseConfig = {
  apiKey: "AIzaSyDJVqxezqWthIg6Lixkrhw-tlWo_uf8WFw",
  authDomain: "feen-marine-hr.firebaseapp.com",
  databaseURL: "https://feen-marine-hr-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "feen-marine-hr",
  storageBucket: "feen-marine-hr.firebasestorage.app",
  messagingSenderId: "912900137932",
  appId: "1:912900137932:web:2857c21d0573522630b369",
};

export const firebaseApp = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
export const db = getDatabase(firebaseApp);
export const auth = getAuth(firebaseApp);
