export interface FirestorePermissionErrorData {
  path: string;
  operation: "read" | "create" | "update" | "delete" | "write";
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  requestResourceData?: any;
}

export class FirestorePermissionError extends Error {
  public data: FirestorePermissionErrorData;

  constructor(data: FirestorePermissionErrorData) {
    super(`Permission denied for ${data.operation} on ${data.path}`);
    this.name = "FirestorePermissionError";
    this.data = data;
  }
}
