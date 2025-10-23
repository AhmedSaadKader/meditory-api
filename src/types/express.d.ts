import { RequestContext } from '../auth/types/request-context';

declare global {
  namespace Express {
    interface Request {
      __request_context__?: RequestContext;
      session?: {
        token?: string;
      } | null;
    }
  }
}
