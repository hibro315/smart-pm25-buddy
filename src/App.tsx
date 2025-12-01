import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import Home from "./pages/Home";
import Dashboard from "./pages/Dashboard";
import Map from "./pages/Map";
import Chat from "./pages/Chat";
import Notifications from "./pages/Notifications";
import Auth from "./pages/Auth";
import Install from "./pages/Install";
import NotFound from "./pages/NotFound";
import BottomNav from "./components/BottomNav";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
});

const App = () => {
  useEffect(() => {
    // Set up auth state listener for automatic token refresh
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "TOKEN_REFRESHED") {
        console.log("🔄 Token refreshed successfully");
      } else if (event === "SIGNED_OUT") {
        console.log("👋 User signed out");
      } else if (event === "SIGNED_IN") {
        console.log("✅ User signed in");
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <ErrorBoundary
      onError={(error, errorInfo) => {
        // Log to monitoring service in production
        console.error('App-level error:', error, errorInfo);
      }}
    >
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              {/* Auth Routes */}
              <Route 
                path="/auth" 
                element={
                  <ErrorBoundary isolate>
                    <Auth />
                  </ErrorBoundary>
                } 
              />
              <Route 
                path="/install" 
                element={
                  <ErrorBoundary isolate>
                    <Install />
                  </ErrorBoundary>
                } 
              />

              {/* Main App Routes with Bottom Navigation */}
              <Route path="/" element={
                <>
                  <ErrorBoundary isolate>
                    <Home />
                  </ErrorBoundary>
                  <BottomNav />
                </>
              } />
              <Route path="/dashboard" element={
                <>
                  <ErrorBoundary isolate>
                    <Dashboard />
                  </ErrorBoundary>
                  <BottomNav />
                </>
              } />
              <Route path="/map" element={
                <>
                  <ErrorBoundary isolate>
                    <Map />
                  </ErrorBoundary>
                  <BottomNav />
                </>
              } />
              <Route path="/chat" element={
                <>
                  <ErrorBoundary isolate>
                    <Chat />
                  </ErrorBoundary>
                  <BottomNav />
                </>
              } />
              <Route path="/notifications" element={
                <>
                  <ErrorBoundary isolate>
                    <Notifications />
                  </ErrorBoundary>
                  <BottomNav />
                </>
              } />

              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
};

export default App;
