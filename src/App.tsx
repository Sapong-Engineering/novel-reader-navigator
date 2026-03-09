import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import ErrorBoundary from "./components/ErrorBoundary";

const Reader = lazy(() => import("./pages/Reader"));
const Auth = lazy(() => import("./pages/Auth"));
const Admin = lazy(() => import("./pages/Admin"));
const NotFound = lazy(() => import("./pages/NotFound"));
import SyncErrorBanner from "./components/SyncErrorBanner";
import { ThemeProvider } from "./contexts/ThemeContext";
import { ReaderProvider } from "./contexts/ReaderContext";
import { AppSettingsProvider } from "./contexts/AppSettingsContext";

const queryClient = new QueryClient();

const App = () => (
  <ErrorBoundary>
    <ThemeProvider>
      <AppSettingsProvider>
        <ReaderProvider>
          <QueryClientProvider client={queryClient}>
            <TooltipProvider>
              <Toaster />
              <Sonner />
              <SyncErrorBanner />
              <BrowserRouter>
                <Routes>
                <Route path="/" element={<Index />} />
                  <Route path="/auth" element={<Auth />} />
                  <Route path="/admin" element={<Admin />} />
                  <Route path="/reader/:novelId" element={<Reader />} />
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </BrowserRouter>
            </TooltipProvider>
          </QueryClientProvider>
        </ReaderProvider>
      </AppSettingsProvider>
    </ThemeProvider>
  </ErrorBoundary>
);

export default App;
