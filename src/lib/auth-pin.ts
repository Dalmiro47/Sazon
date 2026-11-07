// Pure PIN helpers. No Node or Next server imports: the Edge middleware imports this file.

export const AUTH_COOKIE = 'sazon_auth';

export const AUTH_ERROR_MESSAGE = 'Sesión no válida. Ingresa el PIN de nuevo.';

export type PinCheck = 'ok' | 'denied' | 'misconfigured';

/** Constant-time string compare in plain JS (Edge has no node:crypto). */
export function safeEqual(a: string, b: string): boolean {
  let diff = a.length ^ b.length;
  for (let i = 0; i < b.length; i++) {
    // charCodeAt past the end is NaN, which bitwise ops treat as 0
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

/**
 * Checks a cookie value against AUTH_PIN.
 * AUTH_PIN unset: open outside production (dev), closed in production.
 */
export function checkPin(value: string | undefined): PinCheck {
  const expectedPin = process.env.AUTH_PIN?.trim();
  if (!expectedPin) {
    return process.env.NODE_ENV === 'production' ? 'misconfigured' : 'ok';
  }
  return value !== undefined && safeEqual(value, expectedPin) ? 'ok' : 'denied';
}
