const grpcAlreadyExistsCode = 6;

export const isAlreadyExistsError = (error: unknown): boolean => {
  if (error === undefined || typeof error !== 'object') {
    return false;
  }

  const grpcError = error as { code?: number; message?: string; details?: string };

  if (grpcError.code === grpcAlreadyExistsCode) {
    return true;
  }

  const details = `${grpcError.message ?? ''} ${grpcError.details ?? ''}`.toLowerCase();

  return details.includes('already exists');
};
