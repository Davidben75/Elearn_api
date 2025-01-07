import { Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  handleRequest(err, user) {
    if (err || !user) {
      if (err?.name === 'TokenExpiredError') {
        throw new UnauthorizedException(
          'Your session has expired. Please login again.',
        );
      }
      throw (
        err || new UnauthorizedException('Session not validated. Please login')
      );
    }
    return user;
  }
}
