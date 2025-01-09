import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    let status = HttpStatus.BAD_REQUEST;
    let message = 'An unexpected error occurred';
    let error = 'Bad Request';
    let errors: string[] | undefined = undefined;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
        const exceptionResponseObj = exceptionResponse as Record<
          string,
          unknown
        >;

        if ('message' in exceptionResponseObj) {
          if (Array.isArray(exceptionResponseObj.message)) {
            errors = exceptionResponseObj.message as string[];
            message = 'Validation failed';
          } else if (typeof exceptionResponseObj.message === 'string') {
            message = exceptionResponseObj.message;
          }
        }

        if (
          'error' in exceptionResponseObj &&
          typeof exceptionResponseObj.error === 'string'
        ) {
          error = exceptionResponseObj.error;
        }
      } else {
        message = exception.message;
      }
    }

    // FOR DEBUG
    console.error('EXCEPTION FILTER', exception);
    console.error('EXCEPTION FILTER', message);

    response.status(status).json({
      statusCode: status,
      message: message,
      error: errors ?? error,
    });
  }
}
