import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Install from "./pages/Install";
import NotFound from "./pages/NotFound";

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
              <Route 
                path="/" 
                element={
                  <ErrorBoundary isolate>
                    <Index />
                  </ErrorBoundary>
                } 
              />
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
