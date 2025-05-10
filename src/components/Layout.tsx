
import { ReactNode, ErrorBoundary } from 'react';
import { NavBar } from './NavBar';
import { Footer } from './Footer';

interface LayoutProps {
  children: ReactNode;
}

// Create a simple fallback component to show when errors occur
const ErrorFallback = () => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background text-foreground p-4">
      <h2 className="text-xl font-bold mb-2">Something went wrong</h2>
      <p className="text-muted-foreground mb-4">We encountered an error while loading this page.</p>
      <button 
        className="px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90 transition-colors" 
        onClick={() => window.location.reload()}
      >
        Try again
      </button>
    </div>
  );
};

export function Layout({ children }: LayoutProps) {
  // We need to wrap the ErrorBoundary manually since React's ErrorBoundary is a class component
  try {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <NavBar />
        <main className="container max-w-3xl py-8 px-4 flex-grow">
          {children}
        </main>
        <Footer />
      </div>
    );
  } catch (error) {
    console.error("Layout render error:", error);
    return <ErrorFallback />;
  }
}
