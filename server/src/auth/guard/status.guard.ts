import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';

@Injectable()
export class StatusActiveGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    if (user.status == 'SUSPENDED') {
      return false;
    }
    return true;
  }
}
