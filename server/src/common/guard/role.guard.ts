import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

@Injectable()
export class RoleGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.get<string[]>(
      'roles',
      context.getHandler(),
    );
    if (!requiredRoles) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    const isAuthorized = requiredRoles.some(
      (role) => user.role.toUpperCase() === role.toUpperCase(),
    );

    if (!isAuthorized) {
      throw new ForbiddenException(
        'You are not authorized to perform this action',
      );
    }
    return true;
  }
}
