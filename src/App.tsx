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
import Settings from "./pages/Settings";
import MyDrafts from "./pages/MyDrafts";
import Notifications from "./pages/Notifications";
import { NotificationsProvider } from "./context/NotificationsContext";
import { getCurrentUser } from "aws-amplify/auth";
import { useState, useEffect } from "react";

const queryClient = new QueryClient();

const App = () => {
  const [currentUserId, setCurrentUserId] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const getUserId = async () => {
      try {
        const user = await getCurrentUser();
        setCurrentUserId(user.username);
        console.log('🔑 App - User ID set:', user.username);
      } catch (error) {
        console.log('User not logged in');
        // Use a fallback for anonymous users
        const storedUserId = localStorage.getItem('auction-user-id');
        if (storedUserId) {
          setCurrentUserId(storedUserId);
          console.log('🔑 App - Using stored user ID:', storedUserId);
        } else {
          const newUserId = `user-${Math.random().toString(36).substring(2, 10)}`;
          localStorage.setItem('auction-user-id', newUserId);
          setCurrentUserId(newUserId);
          console.log('🔑 App - Created new user ID:', newUserId);
        }
      } finally {
        setIsLoading(false);
      }
    };
    getUserId();
  }, []);

  if (isLoading) {
    return <div>Loading...</div>; // Or your loading component
  }

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <NotificationsProvider userId={currentUserId}>
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
            <Route path="/payment" element={<PaymentPage />} />
            <Route path="/notifications" element={<Notifications />} />
            <Route path="/payment-success" element={<PaymentSuccess />} />
            <Route path="/payment-cancelled" element={<PaymentCancelled />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/my-drafts" element={<MyDrafts />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </NotificationsProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;