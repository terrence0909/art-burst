import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import AuctionDetails from "./pages/AuctionDetails";
import Browse from "./pages/Browse";
import ArtistProfile from "./pages/ArtistProfile";
import Dashboard from "./pages/Dashboard";
import Auth from "./pages/Auth";
import CreateAuction from "./pages/CreateAuction";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/auction/:id" element={<AuctionDetails />} />
          <Route path="/browse" element={<Browse />} />
          <Route path="/artist/:id" element={<ArtistProfile />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/create" element={<CreateAuction />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;