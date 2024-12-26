import { ApiResponse } from '.';

export function successResponse<T>(
  data: T,
  message: string,
  statusCode: number,
): ApiResponse<T> {
  return {
    data,
    message,
    statusCode,
  };
}
