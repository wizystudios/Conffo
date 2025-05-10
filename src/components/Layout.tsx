
import { ReactNode, Component } from 'react';
import { NavBar } from './NavBar';
import { Footer } from './Footer';

interface LayoutProps {
  children: ReactNode;
}

// Error boundary implemented as a class component, since React requires error boundaries to be classes
class ErrorBoundary extends Component<{children: ReactNode}, {hasError: boolean}> {
  constructor(props: {children: ReactNode}) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(_: Error) {
    // Update state so the next render will show the fallback UI
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // You can log the error to an error reporting service
    console.error("Error caught by ErrorBoundary:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      // Render fallback UI
      return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-background text-foreground p-4">
          <h2 className="text-xl font-bold mb-2">Something went wrong</h2>
          <p className="text-muted-foreground mb-4">We encountered an error while loading this page.</p>
          <button 
            className="px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90 transition-colors" 
            onClick={() => this.setState({ hasError: false })}
          >
            Try again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
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
  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-background flex flex-col">
        <NavBar />
        <main className="container max-w-3xl py-4 sm:py-6 md:py-8 px-2 sm:px-3 md:px-4 flex-grow">
          {children}
        </main>
        <Footer />
      </div>
    </ErrorBoundary>
  );
}
