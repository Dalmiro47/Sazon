import Link from 'next/link';
import { ChefHat } from 'lucide-react';

export function Nav() {
  return (
    <header className="border-b border-[#E8E0D0] bg-[#FDF8F2]">
      <nav className="mx-auto flex max-w-4xl items-center px-4 py-3">
        <Link href="/" className="flex items-center gap-2 text-xl font-bold text-[#2C2416]">
          <ChefHat size={22} className="text-[#5C7A3E]" />
          Sazón
        </Link>
      </nav>
    </header>
  );
}
