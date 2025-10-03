import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Routes, Route } from "react-router-dom"; 
import Index from "./pages/Index";
import AuctionDetails from "./pages/AuctionDetails";
import Browse from "./pages/Browse";
import ArtistProfile from "./pages/ArtistProfile";
import Dashboard from "./pages/Dashboard";
import AuthPage from "./pages/AuthPage";
import CreateAuction from "./pages/CreateAuction";
import PaymentPage from "./pages/PaymentPage";
import PaymentSuccess from "./pages/PaymentSuccess";
import PaymentCancelled from "./pages/PaymentCancelled";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      {/* Removed BrowserRouter wrapper - it will be in main.tsx */}
      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="/auction/:id" element={<AuctionDetails />} />
        <Route path="/browse" element={<Browse />} />
        <Route path="/artist/:id" element={<ArtistProfile />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/auth" element={<AuthPage />} />
        <Route path="/create" element={<CreateAuction />} />
        <Route path="/payment" element={<PaymentPage />} /> {/* Add this line */}
        <Route path="*" element={<NotFound />} />
        <Route path="/payment-success" element={<PaymentSuccess />} />
        <Route path="/payment-cancelled" element={<PaymentCancelled />} />
      </Routes>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;