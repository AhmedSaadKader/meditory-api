/**
 * Type-safe error result guards for testing
 * Inspired by Vendure's ErrorResultGuard pattern
 */

export class ErrorResultGuard<T> {
  readonly successCheck: (input: any) => boolean;

  constructor(successCheck: (input: any) => boolean) {
    this.successCheck = successCheck;
  }

  /**
   * Check if result is a success
   */
  isSuccess(input: any): input is T {
    return this.successCheck(input);
  }

  /**
   * Check if result is an error
   */
  isError(input: any): boolean {
    return !this.successCheck(input);
  }

  /**
   * Assert that result is a success, throw if error
   */
  assertSuccess: (input: any) => asserts input is T = (
    input: any,
  ): asserts input is T => {
    if (!this.successCheck(input)) {
      throw new Error(
        `Expected success result, got error: ${JSON.stringify(input)}`,
      );
    }
  };

  /**
   * Assert that result is an error, throw if success
   */
  assertError(input: any): void {
    if (this.successCheck(input)) {
      throw new Error(
        `Expected error result, got success: ${JSON.stringify(input)}`,
      );
    }
  }
}

/**
 * Create an error guard with a success check function
 */
export function createErrorGuard<T>(
  successCheck: (input: any) => boolean,
): ErrorResultGuard<T> {
  return new ErrorResultGuard<T>(successCheck);
}

// Pre-built guards for common response types

export const loginGuard = createErrorGuard<{
  success: boolean;
  token: string;
  user: any;
}>((input) => input?.success === true && input?.token && input?.user);

export const registerGuard = createErrorGuard<{
  success: boolean;
  message: string;
  user: any;
}>((input) => input?.success === true && input?.user);

export const userGuard = createErrorGuard<{ userId: string; email: string }>(
  (input) => input?.userId && input?.email,
);

export const successGuard = createErrorGuard<{ success: boolean }>(
  (input) => input?.success === true,
);

export const messageGuard = createErrorGuard<{ message: string }>(
  (input) => typeof input?.message === 'string',
);
