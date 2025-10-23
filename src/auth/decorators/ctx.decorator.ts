import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';
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
  (_data: unknown, context: ExecutionContext): RequestContext | undefined => {
    // For REST APIs only
    const request = context.switchToHttp().getRequest<Request>();
    return request.__request_context__;
  },
);
