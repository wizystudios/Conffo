
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useState, lazy, Suspense } from "react";
import { AuthProvider } from "./context/AuthContext";
import HomePage from "./pages/HomePage";

// Use lazy loading for non-critical pages
const RoomsPage = lazy(() => import("./pages/RoomsPage"));
const RoomPage = lazy(() => import("./pages/RoomPage"));
const ProfilePage = lazy(() => import("./pages/ProfilePage"));
const ConfessionPage = lazy(() => import("./pages/ConfessionPage"));
const TrendingPage = lazy(() => import("./pages/TrendingPage"));
const AdminPage = lazy(() => import("./pages/AdminPage"));
const AuthPage = lazy(() => import("./pages/AuthPage"));
const TermsPage = lazy(() => import("./pages/TermsPage"));
const PrivacyPage = lazy(() => import("./pages/PrivacyPage"));
const NotFound = lazy(() => import("./pages/NotFound"));

const LoadingFallback = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="text-center">
      <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
      <p className="mt-2 text-sm text-muted-foreground">Loading...</p>
    </div>
  </div>
);

const App = () => {
  // Create a new QueryClient instance with error handling
  const [queryClient] = useState(() => 
    new QueryClient({
      defaultOptions: {
        queries: {
          retry: 1,
          refetchOnWindowFocus: false,
          staleTime: 5 * 60 * 1000, // 5 minutes
        },
      }
    })
  );
  
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <AuthProvider>
            <Suspense fallback={<LoadingFallback />}>
              <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/rooms" element={<RoomsPage />} />
                <Route path="/room/:roomId" element={<RoomPage />} />
                <Route path="/profile" element={<ProfilePage />} />
                <Route path="/confession/:confessionId" element={<ConfessionPage />} />
                <Route path="/trending" element={<TrendingPage />} />
                <Route path="/admin" element={<AdminPage />} />
                <Route path="/auth" element={<AuthPage />} />
                <Route path="/terms" element={<TermsPage />} />
                <Route path="/privacy" element={<PrivacyPage />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </AuthProvider>
        </TooltipProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
};

export default App;
