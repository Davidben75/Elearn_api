import { ApiResponse } from '.';

export function errorResponse<T>(
  errors: string[],
  message: string,
  statusCode: number,
): ApiResponse<T> {
  return {
    data: null,
    message,
    statusCode,
    errors,
  };
}
