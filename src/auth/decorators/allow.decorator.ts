import { SetMetadata } from '@nestjs/common';
import { Permission } from '../enums/permission.enum';

export const PERMISSIONS_METADATA_KEY = '__permissions__';

/**
 * Decorator to specify required permissions for a route
 *
 * @example
 * @Allow(Permission.CreateDrug)
 * @Post()
 * createDrug() { ... }
 */
export const Allow = (...permissions: Permission[]) =>
  SetMetadata(PERMISSIONS_METADATA_KEY, permissions);
