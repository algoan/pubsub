import { status } from '@grpc/grpc-js';

export const isAlreadyExistsError = (error: unknown): boolean => {
  if (!(error instanceof Object)) {
    return false;
  }

  const grpcError = error as { code?: number };

  return grpcError.code === status.ALREADY_EXISTS;
};
