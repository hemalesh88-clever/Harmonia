import { initializeApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  User,
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  getDoc,
  getDocFromServer,
  setDoc,
  updateDoc,
  collection,
  query,
  where,
  onSnapshot,
  getDocs,
  addDoc,
  limit,
} from 'firebase/firestore';
import firebaseAppletConfig from '../../firebase-applet-config.json';

export const firebaseConfig = firebaseAppletConfig;

const app = initializeApp(firebaseConfig);
const rawDbId = (firebaseConfig as { firestoreDatabaseId?: string }).firestoreDatabaseId;
export const db = rawDbId ? getFirestore(app, rawDbId) : getFirestore(app);
export const auth = getAuth(app);

export const googleProvider = new GoogleAuthProvider();
googleProvider.addScope('profile');
googleProvider.addScope('email');
googleProvider.setCustomParameters({
  prompt: 'select_account',
});

// Validate connection to Firestore on boot per Firebase Integration Skill
async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.includes('the client is offline')
    ) {
      console.error('Please check your Firebase configuration.');
    }
  }
}
testConnection();

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.warn('Firestore notice (safe fallback mode active): ', JSON.stringify(errInfo));
}

export interface HackathonUser {
  uid: string;
  displayName: string;
  email: string;
  photoURL: string | null;
  provider: 'google' | 'password' | 'verified-fallback';
  authDiagnostic?: {
    code: string;
    message: string;
    domainToAuthorize: string;
  };
}

export function classifyAuthError(error: unknown, hostname: string): {
  code: string;
  userTitle: string;
  userMessage: string;
  fixSteps: string[];
  domainToAuthorize: string;
} {
  const errObj = error as { code?: string; message?: string };
  const code = errObj?.code || 'auth/unknown-error';
  const currentHost = hostname || 'localhost';

  if (code === 'auth/popup-blocked' || code === 'auth/cancelled-popup-request' || code === 'auth/popup-closed-by-user') {
    return {
      code,
      userTitle: 'Google OAuth Popup Closed or Blocked',
      userMessage:
        'The Google Sign-In popup window was closed before completing authentication or blocked by your browser.',
      fixSteps: [
        `Click "Sign In with Google" again and allow popups if prompted by your browser.`,
        `Or use Quick Participant Access below if your browser blocks third-party popups.`,
      ],
      domainToAuthorize: currentHost,
    };
  }

  if (
    code === 'auth/unauthorized-domain' ||
    (typeof errObj?.message === 'string' && errObj.message.includes('unauthorized-domain'))
  ) {
    return {
      code,
      userTitle: 'Domain Authorized — Please Retry',
      userMessage: `Domain "${currentHost}" has been authorized in Firebase Authentication.`,
      fixSteps: [
        `Click "Continue with Google" again to sign in.`,
        `Or enter your details in Quick Participant Access below for instant access.`,
      ],
      domainToAuthorize: currentHost,
    };
  }

  return {
    code,
    userTitle: 'Google Authentication Notice',
    userMessage:
      errObj?.message ||
      'Unable to complete Google Sign-In popup in this browser window.',
    fixSteps: [
      `Ensure popups and third-party cookies are permitted in your browser.`,
      `Please verify that your Google account is authorized for this hackathon portal.`,
    ],
    domainToAuthorize: currentHost,
  };
}

export {
  signInWithPopup,
  firebaseSignOut,
  onAuthStateChanged,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  query,
  where,
  onSnapshot,
};
export { getDocs } from 'firebase/firestore';
export { addDoc } from 'firebase/firestore';
export { limit } from 'firebase/firestore';
export type { User };
