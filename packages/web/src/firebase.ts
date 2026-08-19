import { getApp, getApps, initializeApp, type FirebaseOptions } from 'firebase/app';
import {
  browserLocalPersistence,
  initializeAuth,
  signInAnonymously,
  type Auth,
  type User,
} from 'firebase/auth';

const FIREBASE_CONFIG: FirebaseOptions = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

let auth: Auth | undefined;
let anonymousUserPromise: Promise<User> | undefined;

export async function authorizedFetch(
  input: RequestInfo | URL,
  init: RequestInit = {},
): Promise<Response> {
  const user = await getAnonymousUser();
  const headers = new Headers(init.headers);
  headers.set('Authorization', `Bearer ${await user.getIdToken()}`);
  const response = await fetch(input, { ...init, headers });
  return response;
}

async function getAnonymousUser(): Promise<User> {
  anonymousUserPromise ??= authenticateAnonymously().catch(error => {
    anonymousUserPromise = undefined;
    throw error;
  });

  return anonymousUserPromise;
}

async function authenticateAnonymously(): Promise<User> {
  const firebaseAuth = getFirebaseAuth();
  await firebaseAuth.authStateReady();
  return firebaseAuth.currentUser ?? (await signInAnonymously(firebaseAuth)).user;
}

function getFirebaseAuth(): Auth {
  if (!Object.values(FIREBASE_CONFIG).every(Boolean)) {
    throw new Error('Firebase web configuration is incomplete');
  }

  const firebaseApp = getApps().length > 0 ? getApp() : initializeApp(FIREBASE_CONFIG);
  auth ??= initializeAuth(firebaseApp, { persistence: browserLocalPersistence });
  return auth;
}
