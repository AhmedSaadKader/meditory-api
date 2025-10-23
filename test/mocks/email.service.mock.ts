/**
 * Mock Email Service for testing
 * Captures emails and tokens sent during tests
 */

export interface CapturedEmail {
  type: 'verification' | 'passwordReset';
  to: string;
  token: string;
  sentAt: Date;
}

export class MockEmailService {
  private sentEmails: CapturedEmail[] = [];

  /**
   * Mock sending verification email
   */
  async sendVerificationEmail(email: string, token: string): Promise<void> {
    this.sentEmails.push({
      type: 'verification',
      to: email,
      token,
      sentAt: new Date(),
    });
  }

  /**
   * Mock sending password reset email
   */
  async sendPasswordResetEmail(email: string, token: string): Promise<void> {
    this.sentEmails.push({
      type: 'passwordReset',
      to: email,
      token,
      sentAt: new Date(),
    });
  }

  /**
   * Get the last email sent
   */
  getLastEmail(type?: 'verification' | 'passwordReset'): CapturedEmail | null {
    const emails = type
      ? this.sentEmails.filter(e => e.type === type)
      : this.sentEmails;

    return emails.length > 0 ? emails[emails.length - 1] : null;
  }

  /**
   * Get all emails sent to a specific address
   */
  getEmailsSentTo(email: string): CapturedEmail[] {
    return this.sentEmails.filter(e => e.to === email);
  }

  /**
   * Get the last token sent
   */
  getLastToken(type?: 'verification' | 'passwordReset'): string | null {
    const lastEmail = this.getLastEmail(type);
    return lastEmail ? lastEmail.token : null;
  }

  /**
   * Check if any email was sent
   */
  wasEmailSent(email?: string, type?: 'verification' | 'passwordReset'): boolean {
    let filtered = this.sentEmails;

    if (email) {
      filtered = filtered.filter(e => e.to === email);
    }

    if (type) {
      filtered = filtered.filter(e => e.type === type);
    }

    return filtered.length > 0;
  }

  /**
   * Get count of emails sent
   */
  getEmailCount(): number {
    return this.sentEmails.length;
  }

  /**
   * Clear all captured emails
   */
  clear(): void {
    this.sentEmails = [];
  }

  /**
   * Get all sent emails
   */
  getAllEmails(): CapturedEmail[] {
    return [...this.sentEmails];
  }
}

/**
 * Singleton instance for use in tests
 */
export const mockEmailService = new MockEmailService();
