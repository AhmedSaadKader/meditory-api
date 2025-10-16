import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { SessionService } from '../services/session.service';
import { RequestContext } from '../types/request-context';
import { Permission } from '../enums/permission.enum';
import { PERMISSIONS_METADATA_KEY } from '../decorators/allow.decorator';
import { REQUEST_CONTEXT_KEY } from '../decorators/ctx.decorator';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private sessionService: SessionService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // 1. Check if route is public
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      // Still create an empty context for public routes
      const request = this.getRequest(context);
      request[REQUEST_CONTEXT_KEY] = RequestContext.empty();
      return true;
    }

    // 2. Get required permissions from @Allow decorator
    const permissions = this.reflector.get<Permission[]>(
      PERMISSIONS_METADATA_KEY,
      context.getHandler(),
    );

    // 3. Get request object
    const request = this.getRequest(context);

    // 4. Extract session token
    const sessionToken = this.extractSessionToken(request);

    // 5. Get session if token exists
    let session = sessionToken
      ? await this.sessionService.getSessionFromToken(sessionToken)
      : undefined;

    // 6. Handle Owner permission (allow without session)
    const hasOwnerPermission = permissions?.includes(Permission.Owner);
    const authorizedAsOwnerOnly =
      hasOwnerPermission && !permissions?.some((p) => p !== Permission.Owner);

    // 7. Create RequestContext
    const isAuthorized = !!session?.user;
    const requestContext = new RequestContext(
      session,
      isAuthorized,
      authorizedAsOwnerOnly,
    );

    // 8. Store RequestContext on request object
    request[REQUEST_CONTEXT_KEY] = requestContext;

    // 9. Check permissions
    if (!permissions || permissions.length === 0) {
      // No permissions specified - allow if route is not explicitly protected
      return true;
    }

    // Check for Public permission
    if (permissions.includes(Permission.Public)) {
      return true;
    }

    // Check for Authenticated permission - just need valid session
    if (permissions.includes(Permission.Authenticated)) {
      if (!isAuthorized) {
        throw new UnauthorizedException('Authentication required');
      }
      return true;
    }

    // Check if user has required permissions
    const canActivate =
      requestContext.userHasPermissions(permissions) ||
      requestContext.authorizedAsOwnerOnly;

    if (!canActivate) {
      if (!isAuthorized) {
        throw new UnauthorizedException('Authentication required');
      }
      throw new ForbiddenException('Insufficient permissions');
    }

    return true;
  }

  /**
   * Extract request object from execution context
   */
  private getRequest(context: ExecutionContext): any {
    // For REST APIs only
    return context.switchToHttp().getRequest();
  }

  /**
   * Extract session token from cookie or Authorization header
   */
  private extractSessionToken(request: any): string | undefined {
    // Try cookie first (session middleware)
    if (request.session?.token) {
      return request.session.token;
    }

    // Try Authorization header (Bearer token)
    const authHeader = request.headers?.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }

    return undefined;
  }
}
