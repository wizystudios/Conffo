
import { ReactNode } from 'react';
import { NavBar } from './NavBar';
import { Footer } from './Footer';

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <NavBar />
      <main className="container max-w-3xl py-8 px-4 flex-grow">
        {children}
      </main>
      <Footer />
    </div>
  );
}
