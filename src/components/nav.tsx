import Link from 'next/link';

export function Nav() {
  return (
    <header className="border-b">
      <nav className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3">
        <Link href="/" className="text-xl font-bold">
          Sazon
        </Link>
        <div className="flex gap-4">
          <Link
            href="/recipes/suggest"
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            Sugerir receta
          </Link>
          <Link
            href="/recipes/new"
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            Nueva receta
          </Link>
        </div>
      </nav>
    </header>
  );
}
