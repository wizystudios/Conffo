
import { ReactNode } from 'react';
import { NavBar } from './NavBar';

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  return (
    <div className="min-h-screen bg-background">
      <NavBar />
      <main className="container max-w-3xl py-8 px-4">
        {children}
      </main>
    </div>
  );
}
