import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = '__is_public__';

/**
 * Decorator to mark routes as public (skip authentication)
 *
 * @example
 * @Public()
 * @Get('health')
 * healthCheck() { ... }
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
