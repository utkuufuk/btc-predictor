import { getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

// The Firebase project ID is public web configuration, so the API can reuse it locally.
// Cloud Run infers the project from Application Default Credentials when it is absent.
// oxlint-disable-next-line node/no-process-env
const projectId = process.env.VITE_FIREBASE_PROJECT_ID;
const firebaseApp =
  getApps()[0] ?? initializeApp(projectId === undefined ? undefined : { projectId });

export const firebaseAuth = getAuth(firebaseApp);
export const firestore = getFirestore(firebaseApp);
