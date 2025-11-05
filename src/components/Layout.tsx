
import { ReactNode, Component, useState } from 'react';
import { NavBar } from './NavBar';
import { Footer } from './Footer';
import { BottomNavigation } from './BottomNavigation';
import { useIncomingCalls } from "@/hooks/useIncomingCalls";
import { IncomingCallModal } from "@/components/IncomingCallModal";
import { CallInterface } from "@/components/CallInterface";
import { WebRTCService } from "@/services/webRTCService";

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

export function Layout({ children }: LayoutProps) {
  const { incomingCall, clearIncomingCall } = useIncomingCalls();
  const [activeCall, setActiveCall] = useState<{
    webRTCService: WebRTCService;
    targetUserId: string;
    targetUsername?: string;
    callType: 'audio' | 'video';
  } | null>(null);

  const handleAcceptCall = (webRTCService: WebRTCService) => {
    if (incomingCall) {
      setActiveCall({
        webRTCService,
        targetUserId: incomingCall.from,
        callType: 'video', // Default to video
      });
      clearIncomingCall();
    }
  };

  const handleDeclineCall = () => {
    clearIncomingCall();
  };

  const handleEndCall = () => {
    setActiveCall(null);
  };

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-background flex flex-col">
        <NavBar />
        <main className="container max-w-full px-1 sm:px-2 md:px-3 flex-grow pt-14 sm:pt-16 pb-14 md:pb-4">
          {children}
        </main>
        <BottomNavigation />
        
        {/* Incoming Call Modal */}
        <IncomingCallModal
          callSignal={incomingCall}
          onAccept={handleAcceptCall}
          onDecline={handleDeclineCall}
        />

        {/* Active Call Interface */}
        {activeCall && (
          <CallInterface
            isOpen={true}
            onClose={handleEndCall}
            callType={activeCall.callType}
            targetUserId={activeCall.targetUserId}
            targetUsername={activeCall.targetUsername}
          />
        )}
      </div>
    </ErrorBoundary>
  );
}
