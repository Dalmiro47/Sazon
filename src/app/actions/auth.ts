'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { AUTH_COOKIE, safeEqual } from '@/lib/auth-pin';

const FAILED_LOGIN_DELAY_MS = 1000;

export async function loginAction(pin: string): Promise<{ ok: boolean }> {
  const expectedPin = process.env.AUTH_PIN?.trim();
  if (!expectedPin || typeof pin !== 'string' || !safeEqual(pin, expectedPin)) {
    // Slows down serial PIN guessing; does not stop parallel attempts
    await new Promise((resolve) => setTimeout(resolve, FAILED_LOGIN_DELAY_MS));
    return { ok: false };
  }
  cookies().set(AUTH_COOKIE, pin, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 365,
    path: '/',
  });
  return { ok: true };
}

export async function logoutAction(): Promise<void> {
  cookies().delete(AUTH_COOKIE);
  redirect('/auth');
}
