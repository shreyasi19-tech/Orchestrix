import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  updateProfile,
  User as FirebaseUser,
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

// Initialize Firebase App
export const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Firebase Auth & Firestore Instances
export const auth = getAuth(app);
export const db =
  firebaseConfig.firestoreDatabaseId && firebaseConfig.firestoreDatabaseId !== '(default)'
    ? getFirestore(app, firebaseConfig.firestoreDatabaseId)
    : getFirestore(app);

export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

export interface UserProfileData {
  uid: string;
  email: string;
  displayName: string;
  role: string;
  photoURL?: string;
  createdAt?: string;
  lastLoginAt?: string;
}

// Sync user profile to Firestore — new users are strictly provisioned as 'Viewer'
export async function syncUserProfile(firebaseUser: FirebaseUser): Promise<UserProfileData> {
  const userRef = doc(db, 'users', firebaseUser.uid);
  const now = new Date().toISOString();
  try {
    const snap = await getDoc(userRef);
    if (snap.exists()) {
      const data = snap.data() as UserProfileData;
      await setDoc(userRef, { lastLoginAt: now }, { merge: true });
      return data;
    } else {
      const profile: UserProfileData = {
        uid: firebaseUser.uid,
        email: firebaseUser.email || '',
        displayName:
          firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'Operator',
        role: 'Viewer',
        createdAt: now,
        lastLoginAt: now,
      };
      if (firebaseUser.photoURL) {
        profile.photoURL = firebaseUser.photoURL;
      }
      await setDoc(userRef, profile);
      return profile;
    }
  } catch (err) {
    console.warn('Firestore profile sync fallback to local info:', err);
    return {
      uid: firebaseUser.uid,
      email: firebaseUser.email || '',
      displayName: firebaseUser.displayName || 'Operator',
      role: 'Viewer',
      photoURL: firebaseUser.photoURL || undefined,
      createdAt: now,
    };
  }
}

// Sign in with Google
export async function signInWithGoogle(): Promise<{ user: UserProfileData; token: string }> {
  const result = await signInWithPopup(auth, googleProvider);
  const token = await result.user.getIdToken();
  const profile = await syncUserProfile(result.user);
  return { user: profile, token };
}

// Sign in with Email / Password
export async function signInWithEmail(
  email: string,
  pass: string
): Promise<{ user: UserProfileData; token: string }> {
  const result = await signInWithEmailAndPassword(auth, email, pass);
  const token = await result.user.getIdToken();
  const profile = await syncUserProfile(result.user);
  return { user: profile, token };
}

// Register with Email / Password (always provisioned as Viewer)
export async function registerWithEmail(
  name: string,
  email: string,
  pass: string
): Promise<{ user: UserProfileData; token: string }> {
  const result = await createUserWithEmailAndPassword(auth, email, pass);
  if (name) {
    await updateProfile(result.user, { displayName: name });
  }
  const token = await result.user.getIdToken();
  const profile = await syncUserProfile(result.user);
  return { user: profile, token };
}

// Sign out
export async function signOutFirebase(): Promise<void> {
  await signOut(auth);
}
