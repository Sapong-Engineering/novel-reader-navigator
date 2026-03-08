import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Reader from "./pages/Reader";
import Auth from "./pages/Auth";
import Admin from "./pages/Admin";
import NotFound from "./pages/NotFound";
import ErrorBoundary from "./components/ErrorBoundary";
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
