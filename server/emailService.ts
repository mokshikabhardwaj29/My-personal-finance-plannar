/**
 * Configurable Email Service Adapter
 *
 * Sits behind a pluggable interface controlled by environment variables:
 * - EMAIL_PROVIDER: 'console' | 'resend' | 'sendgrid' | 'mock'
 * - EMAIL_API_KEY: Provider API key
 * - EMAIL_FROM: Sender email address (defaults to 'noreply@ledgerly.internal')
 */

export interface EmailMessage {
  to: string;
  subject: string;
  html: string;
  text: string;
}

export interface EmailProvider {
  name: string;
  sendEmail(message: EmailMessage): Promise<{ success: boolean; messageId?: string; error?: string }>;
}

/**
 * Console/Dev Provider: logs formatted emails to stdout (ideal for development and testing)
 */
export class ConsoleEmailProvider implements EmailProvider {
  name = 'console';
  async sendEmail(message: EmailMessage): Promise<{ success: boolean; messageId: string }> {
    const messageId = `msg_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    console.log('\n================== [LEDGERLY EMAIL DISPATCH] ==================');
    console.log(`To: ${message.to}`);
    console.log(`Subject: ${message.subject}`);
    console.log('--- Text Content ---');
    console.log(message.text);
    console.log('================================================================\n');
    return { success: true, messageId };
  }
}

/**
 * Resend Email Provider
 */
export class ResendEmailProvider implements EmailProvider {
  name = 'resend';
  private apiKey: string;
  private from: string;

  constructor(apiKey: string, from = 'Ledgerly Family <noreply@ledgerly.internal>') {
    this.apiKey = apiKey;
    this.from = from;
  }

  async sendEmail(message: EmailMessage): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: this.from,
          to: message.to,
          subject: message.subject,
          html: message.html,
          text: message.text,
        }),
      });
      if (!res.ok) {
        const err = await res.text();
        return { success: false, error: `Resend error: ${err}` };
      }
      const data = (await res.json()) as { id: string };
      return { success: true, messageId: data.id };
    } catch (err: unknown) {
      return { success: false, error: err instanceof Error ? err.message : 'Resend request failed' };
    }
  }
}

/**
 * Mock Provider for Unit & Integration Testing
 */
export class MockEmailProvider implements EmailProvider {
  name = 'mock';
  public sentMessages: EmailMessage[] = [];

  async sendEmail(message: EmailMessage): Promise<{ success: boolean; messageId: string }> {
    this.sentMessages.push(message);
    return { success: true, messageId: `mock_${this.sentMessages.length}` };
  }

  public getLatestMessage(): EmailMessage | undefined {
    return this.sentMessages[this.sentMessages.length - 1];
  }

  public clear() {
    this.sentMessages = [];
  }
}

/**
 * Factory for instantiating the active email provider
 */
export class EmailService {
  private provider: EmailProvider;

  constructor() {
    const providerName = (process.env.EMAIL_PROVIDER || 'console').toLowerCase();
    const apiKey = process.env.EMAIL_API_KEY || process.env.RESEND_API_KEY || '';
    const from = process.env.EMAIL_FROM || 'Ledgerly Family <noreply@ledgerly.internal>';

    if (providerName === 'resend' && apiKey) {
      this.provider = new ResendEmailProvider(apiKey, from);
    } else {
      this.provider = new ConsoleEmailProvider();
    }
  }

  public setProvider(provider: EmailProvider) {
    this.provider = provider;
  }

  public getProviderName(): string {
    return this.provider.name;
  }

  async sendVerificationEmail(email: string, token: string, baseUrl = 'http://localhost:3000'): Promise<boolean> {
    const verifyLink = `${baseUrl}/?verifyToken=${encodeURIComponent(token)}`;
    const subject = 'Verify your Ledgerly family account';
    const text = `Welcome to Ledgerly! Please verify your email address by opening the following link:\n\n${verifyLink}\n\nThis verification link expires in 24 hours.`;
    const html = `
      <div style="font-family: sans-serif; max-width: 560px; margin: 0 auto; padding: 24px;">
        <h2 style="color: #7f27a8;">Welcome to Ledgerly!</h2>
        <p>Please verify your email address to activate your family finance vault.</p>
        <p style="margin: 24px 0;">
          <a href="${verifyLink}" style="background-color: #7f27a8; color: #fff; padding: 12px 24px; border-radius: 12px; text-decoration: none; font-weight: bold; display: inline-block;">
            Verify Email Address
          </a>
        </p>
        <p style="font-size: 12px; color: #666;">Or paste this link into your browser:<br/><a href="${verifyLink}">${verifyLink}</a></p>
        <p style="font-size: 12px; color: #888;">This link will expire in 24 hours.</p>
      </div>
    `;
    const res = await this.provider.sendEmail({ to: email, subject, text, html });
    return res.success;
  }

  async sendPasswordResetEmail(email: string, token: string, baseUrl = 'http://localhost:3000'): Promise<boolean> {
    const resetLink = `${baseUrl}/?resetToken=${encodeURIComponent(token)}`;
    const subject = 'Reset your Ledgerly account password';
    const text = `A password reset was requested for your Ledgerly account. Open this link to choose a new password:\n\n${resetLink}\n\nThis link expires in 1 hour. If you did not request this, you can safely ignore this email.`;
    const html = `
      <div style="font-family: sans-serif; max-width: 560px; margin: 0 auto; padding: 24px;">
        <h2 style="color: #7f27a8;">Password Reset Request</h2>
        <p>A password reset was requested for your Ledgerly account.</p>
        <p style="margin: 24px 0;">
          <a href="${resetLink}" style="background-color: #f76400; color: #fff; padding: 12px 24px; border-radius: 12px; text-decoration: none; font-weight: bold; display: inline-block;">
            Reset Password
          </a>
        </p>
        <p style="font-size: 12px; color: #666;">Or paste this link into your browser:<br/><a href="${resetLink}">${resetLink}</a></p>
        <p style="font-size: 12px; color: #888;">This link will expire in 1 hour. All existing active sessions will be terminated upon reset.</p>
      </div>
    `;
    const res = await this.provider.sendEmail({ to: email, subject, text, html });
    return res.success;
  }
}

export const emailService = new EmailService();
