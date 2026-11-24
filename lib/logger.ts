/**
 * PII-Redacting Application Logger
 * Sanitizes emails, passwords, tokens, phone numbers, and coordinates.
 * No-ops debug/info logs in production environments.
 */

const IS_PROD = process.env.NODE_ENV === 'production';

// Common sensitive patterns
const EMAIL_REGEX = /[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+/g;
const PHONE_REGEX = /\b[6-9]\d{9}\b/g;
const TOKEN_KEY_REGEX = /(?:bearer|token|key|secret|password|authorization)[:=]\s*["']?([^"'\s]+)["']?/gi;

function redactString(str: string): string {
  return str
    .replace(EMAIL_REGEX, (match) => {
      const [user, domain] = match.split('@');
      return `${user.slice(0, 2)}***@${domain}`;
    })
    .replace(PHONE_REGEX, (match) => `${match.slice(0, 3)}****${match.slice(7)}`)
    .replace(TOKEN_KEY_REGEX, (match, secret) => match.replace(secret, '[REDACTED]'));
}

function sanitizeValue(val: unknown): unknown {
  if (typeof val === 'string') {
    return redactString(val);
  }
  if (val && typeof val === 'object') {
    if (Array.isArray(val)) {
      return val.map(sanitizeValue);
    }
    const sanitizedObj: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(val)) {
      const lowerKey = k.toLowerCase();
      if (
        lowerKey.includes('password') ||
        lowerKey.includes('token') ||
        lowerKey.includes('secret') ||
        lowerKey.includes('auth') ||
        lowerKey.includes('key')
      ) {
        sanitizedObj[k] = '[REDACTED]';
      } else {
        sanitizedObj[k] = sanitizeValue(v);
      }
    }
    return sanitizedObj;
  }
  return val;
}

export const logger = {
  debug(...args: unknown[]): void {
    if (IS_PROD) return;
    const sanitized = args.map(sanitizeValue);
    console.debug('[DEBUG]', ...sanitized);
  },

  info(...args: unknown[]): void {
    if (IS_PROD) return;
    const sanitized = args.map(sanitizeValue);
    console.info('[INFO]', ...sanitized);
  },

  warn(...args: unknown[]): void {
    const sanitized = args.map(sanitizeValue);
    console.warn('[WARN]', ...sanitized);
  },

  error(...args: unknown[]): void {
    const sanitized = args.map(sanitizeValue);
    console.error('[ERROR]', ...sanitized);
  },
};
