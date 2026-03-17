'use client';

import Link from 'next/link';
import { ChefHat, LogOut } from 'lucide-react';
import { logoutAction } from '@/app/actions/auth';

export function Nav() {
  return (
    <header className="border-b border-[#E8E0D0] bg-[#FDF8F2]">
      <nav className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3">
        <Link href="/" className="flex items-center gap-2 text-xl font-bold text-[#2C2416]">
          <ChefHat size={22} className="text-[#5C7A3E]" />
          Sazón
        </Link>
        <button
          onClick={() => logoutAction()}
          className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm text-[#9C8B7A] transition-colors hover:bg-[#F5F0EB] hover:text-[#2C2416]"
        >
          <LogOut size={16} />
          Salir
        </button>
      </nav>
    </header>
  );
}
