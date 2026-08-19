import type { Request, RequestHandler } from 'express';

import { firebaseAuth } from './firebase.js';

const BEARER_PREFIX = 'Bearer ';

export const requireFirebaseUser: RequestHandler = async (request, response, next) => {
  const authorization = request.header('authorization');

  if (!authorization?.startsWith(BEARER_PREFIX)) {
    response.status(401).json({ error: 'Authentication required' });
    return;
  }

  const idToken = authorization.slice(BEARER_PREFIX.length);

  try {
    const decodedToken = await firebaseAuth.verifyIdToken(idToken);
    request.firebaseUid = decodedToken.uid;
    next();
  } catch {
    response.status(401).json({ error: 'Authentication required' });
  }
};

export function getFirebaseUid(request: Request): string {
  if (!request.firebaseUid) {
    throw new Error('Authenticated request is missing a Firebase UID');
  }

  return request.firebaseUid;
}
