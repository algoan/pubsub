import { status } from '@grpc/grpc-js';

/**
 * Returns true if the given error is a gRPC ALREADY_EXISTS error (status code 6).
 * Used to detect race conditions where two processes concurrently attempt to create
 * the same Pub/Sub resource.
 * @param error - The error to inspect
 */
export const isAlreadyExistsError = (error: unknown): boolean => {
  if (!(error instanceof Object)) {
    return false;
  }

  const grpcError = error as { code?: number };

  return grpcError.code === status.ALREADY_EXISTS;
};
