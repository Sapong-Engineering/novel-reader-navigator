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
import AnnouncementBanner from "./components/AnnouncementBanner";
import { ThemeProvider } from "./contexts/ThemeContext";
import { ReaderProvider } from "./contexts/ReaderContext";
import { AppSettingsProvider } from "./contexts/AppSettingsContext";
import { AdminPublicSettingsProvider } from "./contexts/AdminPublicSettingsContext";

const queryClient = new QueryClient();

const App = () => (
  <ErrorBoundary>
    <ThemeProvider>
      <AdminPublicSettingsProvider>
        <AppSettingsProvider>
          <ReaderProvider>
            <QueryClientProvider client={queryClient}>
              <TooltipProvider>
                <Toaster />
                <Sonner />
                <AnnouncementBanner />
                <SyncErrorBanner />
                <BrowserRouter>
                  <Routes>
                    <Route path="/" element={<Index />} />
                    <Route path="/auth" element={<Suspense fallback={null}><Auth /></Suspense>} />
                    <Route path="/admin" element={<Suspense fallback={null}><Admin /></Suspense>} />
                    <Route path="/reader/:novelId" element={<Suspense fallback={null}><Reader /></Suspense>} />
                    <Route path="*" element={<Suspense fallback={null}><NotFound /></Suspense>} />
                  </Routes>
                </BrowserRouter>
              </TooltipProvider>
            </QueryClientProvider>
          </ReaderProvider>
        </AppSettingsProvider>
      </AdminPublicSettingsProvider>
    </ThemeProvider>
  </ErrorBoundary>
);

export default App;
