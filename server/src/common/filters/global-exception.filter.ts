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

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      message = exception.message;
      error = exception.name;
    }
    // FOR DEBUG
    console.error('exception', exception);
    //----------

    response.status(status).json({
      message: message,
      error: error,
      statusCode: status,
    });
  }
}
