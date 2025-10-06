
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useState, lazy, Suspense, useEffect } from "react";
import { AuthProvider } from "./context/AuthContext";
import { ThemeProvider } from "./context/ThemeContext";
import { FishSuccessAnimation } from "./components/FishSuccessAnimation";
import { useSuccessAnimation } from "./hooks/useSuccessAnimation";
import HomePage from "./pages/HomePage";

// Use lazy loading for non-critical pages
const RoomsPage = lazy(() => import("./pages/RoomsPage"));
const RoomPage = lazy(() => import("./pages/RoomPage"));
const ProfilePage = lazy(() => import("./pages/ProfilePage"));
const ConfessionPage = lazy(() => import("./pages/ConfessionPage"));
const TrendingPage = lazy(() => import("./pages/TrendingPage"));
const AdminPage = lazy(() => import("./pages/AdminPage"));
const MultiStepAuthPage = lazy(() => import("./pages/MultiStepAuthPage"));
const TermsPage = lazy(() => import("./pages/TermsPage"));
const PrivacyPage = lazy(() => import("./pages/PrivacyPage"));
const StoriesPage = lazy(() => import("./pages/StoriesPage"));
const NotificationsPage = lazy(() => import("./pages/NotificationsPage"));
const SearchPage = lazy(() => import("./pages/SearchPage"));
const ChatListPage = lazy(() => import("./pages/ChatListPage"));
const ChatPage = lazy(() => import("./pages/ChatPage"));
const RecentPage = lazy(() => import("./pages/RecentPage"));
const CreatePostPage = lazy(() => import("./pages/CreatePostPage"));
const NotFound = lazy(() => import("./pages/NotFound"));

// Import the LoadingFallback component
import { LoadingFallback } from "./components/LoadingFallback";

const App = () => {
  const { showAnimation, message, triggerSuccess, hideAnimation } = useSuccessAnimation();

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

  // Global success animation listener
  useEffect(() => {
    const handleSuccess = (event: CustomEvent) => {
      triggerSuccess(event.detail?.message);
    };

    window.addEventListener('conffo-success', handleSuccess as EventListener);
    return () => window.removeEventListener('conffo-success', handleSuccess as EventListener);
  }, [triggerSuccess]);
  
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <ThemeProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <AuthProvider>
              <Suspense fallback={null}>
                <Routes>
                  {/* Chat-first routing like Telegram */}
                  <Route path="/" element={<ChatListPage />} />
                  <Route path="/chat/:userId" element={<ChatPage />} />
                  
                  {/* Browse all posts from all rooms */}
                  <Route path="/browse" element={<HomePage />} />
                  
                  {/* Room-based confessions */}
                  <Route path="/rooms" element={<RoomsPage />} />
                  <Route path="/room/:roomId" element={<RoomPage />} />
                  
                  {/* Other pages */}
                  <Route path="/profile" element={<ProfilePage />} />
                  <Route path="/user/:userId" element={<ProfilePage />} />
                  <Route path="/confession/:confessionId" element={<ConfessionPage />} />
                  <Route path="/trending" element={<TrendingPage />} />
                  <Route path="/stories" element={<StoriesPage />} />
          <Route path="/notifications" element={<NotificationsPage />} />
          <Route path="/search" element={<SearchPage />} />
          <Route path="/recent" element={<RecentPage />} />
          <Route path="/create" element={<CreatePostPage />} />
          <Route path="/create-post" element={<CreatePostPage />} />
                  <Route path="/admin" element={<AdminPage />} />
                  <Route path="/auth" element={<MultiStepAuthPage />} />
                  <Route path="/terms" element={<TermsPage />} />
                  <Route path="/privacy" element={<PrivacyPage />} />
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </Suspense>
              <FishSuccessAnimation 
                show={showAnimation} 
                message={message}
                onComplete={hideAnimation}
              />
            </AuthProvider>
          </TooltipProvider>
        </ThemeProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
};

export default App;
