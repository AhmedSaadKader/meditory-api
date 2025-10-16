import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { RequestContext } from '../types/request-context';

export const REQUEST_CONTEXT_KEY = '__request_context__';

/**
 * Decorator to inject RequestContext into route handlers
 *
 * @example
 * @Get()
 * getProducts(@Ctx() ctx: RequestContext) { ... }
 */
export const Ctx = createParamDecorator(
  (data: unknown, context: ExecutionContext): RequestContext => {
    // For REST APIs only
    const request = context.switchToHttp().getRequest();
    return request[REQUEST_CONTEXT_KEY];
  },
);
