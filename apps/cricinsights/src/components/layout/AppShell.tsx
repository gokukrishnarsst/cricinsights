'use client';

import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import SiteFooter from './SiteFooter';
import SiteHeader from './SiteHeader';

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isChat =
    pathname === '/chat' || (pathname?.startsWith('/chat/') ?? false);

  return (
    <>
      <SiteHeader />
      <main
        className={cn(
          'pt-[88px]',
          isChat && 'flex min-h-[calc(100dvh-88px)] flex-col',
        )}
      >
        {children}
      </main>
      {!isChat ? <SiteFooter /> : null}
    </>
  );
}
