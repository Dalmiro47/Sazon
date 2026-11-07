import { cookies } from 'next/headers';
import { AUTH_COOKIE, checkPin } from '@/lib/auth-pin';

/** True when the request carries a valid PIN cookie. Call first in every protected Server Action. */
export function requireAuth(): boolean {
  return checkPin(cookies().get(AUTH_COOKIE)?.value) === 'ok';
}
