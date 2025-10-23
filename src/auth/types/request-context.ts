import { CachedSession } from '../services/session.service';
import { Permission } from '../enums/permission.enum';

export class RequestContext {
  constructor(
    public readonly session?: CachedSession,
    public readonly isAuthorized: boolean = false,
    public readonly authorizedAsOwnerOnly: boolean = false,
  ) {}

  /**
   * Get active user ID from session
   */
  get activeUserId(): number | undefined {
    return this.session?.user?.userId;
  }

  /**
   * Get user email from session
   */
  get userEmail(): string | undefined {
    return this.session?.user?.email;
  }

  /**
   * Get user from session
   */
  get user() {
    return this.session?.user;
  }

  /**
   * Check if user has required permissions
   */
  userHasPermissions(permissions: Permission[]): boolean {
    const user = this.session?.user;
    if (!user) {
      return false;
    }

    const userPermissions = user.permissions || [];

    // SuperAdmin has all permissions
    if (userPermissions.includes(Permission.SuperAdmin)) {
      return true;
    }

    // Check if user has any of the required permissions
    return this.arraysIntersect(userPermissions, permissions as string[]);
  }

  /**
   * Check if two arrays have common elements
   */
  private arraysIntersect(arr1: string[], arr2: string[]): boolean {
    return arr1.some((item) => arr2.includes(item));
  }

  /**
   * Create an empty context (for background jobs)
   */
  static empty(): RequestContext {
    return new RequestContext(undefined, true, false);
  }
}
