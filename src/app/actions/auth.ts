'use server';

import { cookies } from 'next/headers';

export async function loginAction(pin: string): Promise<{ ok: boolean }> {
  const expectedPin = process.env.AUTH_PIN;
  if (!expectedPin || pin !== expectedPin) {
    return { ok: false };
  }
  cookies().set('sazon_auth', pin, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 365,
    path: '/',
  });
  return { ok: true };
}
