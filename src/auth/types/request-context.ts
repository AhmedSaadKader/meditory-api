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
   * Get active organization ID from session
   */
  get activeOrganizationId(): string | null | undefined {
    return this.session?.user?.organizationId;
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

    // PlatformSuperAdmin has all permissions
    if (userPermissions.includes(Permission.PlatformSuperAdmin)) {
      return true;
    }

    // SuperAdmin has all permissions
    if (userPermissions.includes(Permission.SuperAdmin)) {
      return true;
    }

    // Check if user has any of the required permissions
    return this.arraysIntersect(userPermissions, permissions as string[]);
  }

  /**
   * Check if user can access a specific pharmacy
   */
  userHasAccessToPharmacy(pharmacyId: string): boolean {
    const user = this.session?.user;
    if (!user) {
      return false;
    }

    // PlatformSuperAdmin can access all pharmacies
    if (user.permissions.includes(Permission.PlatformSuperAdmin)) {
      return true;
    }

    // SuperAdmin can access all pharmacies in their organization
    if (user.permissions.includes(Permission.SuperAdmin)) {
      return true;
    }

    // Check if pharmacy is in user's authorized list
    return user.pharmacyIds.includes(pharmacyId);
  }

  /**
   * Get authorized pharmacy IDs for the user
   * Returns empty array for SuperAdmin (meaning all pharmacies in their org)
   */
  getAuthorizedPharmacyIds(): string[] {
    const user = this.session?.user;
    if (!user) {
      return [];
    }

    // PlatformSuperAdmin or SuperAdmin: empty array means "all pharmacies"
    if (
      user.permissions.includes(Permission.PlatformSuperAdmin) ||
      user.permissions.includes(Permission.SuperAdmin)
    ) {
      return [];
    }

    // Regular user: specific pharmacy list
    return user.pharmacyIds;
  }

  /**
   * Check if user is a platform super admin
   */
  isPlatformSuperAdmin(): boolean {
    return (
      this.session?.user?.permissions?.includes(Permission.PlatformSuperAdmin) ||
      false
    );
  }

  /**
   * Check if user is an organization super admin
   */
  isSuperAdmin(): boolean {
    return (
      this.session?.user?.permissions?.includes(Permission.SuperAdmin) || false
    );
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
