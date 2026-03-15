'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { ChefHat } from 'lucide-react';
import { loginAction } from '@/app/actions/auth';

export default function AuthPage() {
  const [pin, setPin] = useState(['', '', '', '']);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const inputs = useRef<(HTMLInputElement | null)[]>([]);
  const router = useRouter();

  async function submit(fullPin: string) {
    setLoading(true);
    setError('');
    const result = await loginAction(fullPin);
    if (result.ok) {
      router.replace('/');
      router.refresh();
    } else {
      setError('PIN incorrecto');
      setPin(['', '', '', '']);
      inputs.current[0]?.focus();
    }
    setLoading(false);
  }

  function handleChange(index: number, value: string) {
    if (!/^\d?$/.test(value)) return;
    const next = [...pin];
    next[index] = value;
    setPin(next);
    setError('');

    if (value && index < 3) {
      inputs.current[index + 1]?.focus();
    }

    if (value && index === 3) {
      const fullPin = next.join('');
      if (fullPin.length === 4) submit(fullPin);
    }
  }

  function handleKeyDown(index: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace' && !pin[index] && index > 0) {
      inputs.current[index - 1]?.focus();
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#FDF8F2] px-4">
      <div className="w-full max-w-xs rounded-2xl bg-white p-8 shadow-md">
        <div className="mb-6 flex flex-col items-center gap-2">
          <ChefHat size={36} className="text-[#5C7A3E]" />
          <h1 className="text-2xl font-bold text-[#2C2416]">Sazón</h1>
          <p className="text-sm text-[#9C8B7A]">Ingresá el PIN para continuar</p>
        </div>

        <div className="mb-6 flex justify-center gap-3">
          {pin.map((digit, i) => (
            <input
              key={i}
              ref={(el) => { inputs.current[i] = el; }}
              type="password"
              inputMode="numeric"
              maxLength={1}
              value={digit}
              onChange={(e) => handleChange(i, e.target.value)}
              onKeyDown={(e) => handleKeyDown(i, e)}
              disabled={loading}
              className="h-14 w-14 rounded-xl border-2 border-[#E8E0D0] bg-[#F5F0EB] text-center text-xl font-bold text-[#2C2416] outline-none transition-colors focus:border-[#5C7A3E] disabled:opacity-50"
            />
          ))}
        </div>

        {error && (
          <p className="text-center text-sm font-medium text-red-500">{error}</p>
        )}
      </div>
    </div>
  );
}
