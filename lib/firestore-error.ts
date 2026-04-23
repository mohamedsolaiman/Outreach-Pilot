export interface FirestoreErrorInfo {
  error: string;
  operationType: 'create' | 'update' | 'delete' | 'list' | 'get' | 'write';
  path: string | null;
  authInfo?: {
    userId: string;
    email: string | null;
    emailVerified: boolean;
    isAnonymous: boolean;
  }
}

export function handleFirestoreError(error: any, operationType: FirestoreErrorInfo['operationType'], path: string | null, auth: any): never {
  const errorInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    operationType,
    path,
    authInfo: auth?.currentUser ? {
      userId: auth.currentUser.uid,
      email: auth.currentUser.email,
      emailVerified: auth.currentUser.emailVerified,
      isAnonymous: auth.currentUser.isAnonymous,
    } : undefined
  };
  
  console.error("Firestore Operation Failed:", JSON.stringify(errorInfo, null, 2));
  throw new Error(JSON.stringify(errorInfo));
}
