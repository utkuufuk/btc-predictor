declare global {
  namespace Express {
    interface Request {
      firebaseUid?: string;
    }
  }
}

export {};
