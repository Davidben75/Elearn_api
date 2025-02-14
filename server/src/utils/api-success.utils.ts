import { ApiResponse } from '.';

export function successResponse<T extends object>(
  data: any,
  message: string,
  statusCode: number,
): ApiResponse<T> {
  return {
    ...data,
    message,
    statusCode,
  };
}
