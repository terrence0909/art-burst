import { useSearchParams, useNavigate } from "react-router-dom";
import { CheckCircle2, ArrowLeft, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { getCurrentUser } from "aws-amplify/auth";
import { useEffect } from "react";

const PaymentSuccess = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const auctionId = searchParams.get('auctionId');

  // 🔥 ADD THIS SIMPLE LOG (outside useEffect)
  console.log('🔴 PaymentSuccess component RENDERED');

  // 🔥 DEBUG LOGGING
  useEffect(() => {
    console.log('🎯 PaymentSuccess page loaded!');
    console.log('📊 URL Search Params:', Object.fromEntries(searchParams.entries()));
    console.log('🆔 Auction ID from URL:', auctionId);
    console.log('🔗 Current URL:', window.location.href);
    console.log('👤 Current user ID in localStorage:', localStorage.getItem('auction-user-id'));
    
    // Initialize user session
    initializeUserSession();
  }, []);

  const initializeUserSession = async () => {
    try {
      console.log('💰 Initializing user session after payment...');
      const user = await getCurrentUser();
      console.log('✅ Authenticated user:', user);
      localStorage.setItem('auction-user-id', user.userId);
      console.log('✅ User ID set:', user.userId);
    } catch (error) {
      console.log('⚠️ No authenticated user:', error);
      console.log('📝 Current localStorage:', localStorage.getItem('auction-user-id'));
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-300 to-gray-500">
      <Header />
      
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-md mx-auto text-center">
          <CheckCircle2 className="w-20 h-20 text-green-500 mx-auto mb-6" />
          
          <h1 className="text-3xl font-bold mb-4">Payment Successful!</h1>
          
          <Card className="mb-6 backdrop-blur-xl bg-white/20 border border-white/30">
            <CardContent className="pt-6">
              <p className="text-muted-foreground mb-4">
                Thank you for your purchase! Your payment has been processed successfully.
              </p>
              <div className="rounded-lg p-4 backdrop-blur-xl bg-white/20 border border-white/30">
                <p className="text-sm text-green-800">
                  You will receive a confirmation email shortly with your purchase details.
                </p>
                {/* 🔥 ADD DEBUG INFO */}
                <div className="mt-2 text-xs text-gray-600">
                  <p>Auction ID: {auctionId || 'None'}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-3">
            {auctionId && (
              <Button 
                className="w-full backdrop-blur-xl bg-white/20 border border-white/30" 
                onClick={() => navigate(`/auction/${auctionId}`)}
              >
                View Auction
              </Button>
            )}
            
            <Button 
              variant="outline" 
              className="w-full backdrop-blur-xl bg-white/20 border border-white/30" 
              onClick={() => navigate('/')}
            >
              <Home className="w-4 h-4 mr-2" />
              Back to Home
            </Button>
            
            <Button 
              variant="ghost" 
              className="w-full backdrop-blur-xl bg-white/20 border border-white/30" 
              onClick={() => navigate(-1)}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Go Back
            </Button>
          </div>
        </div>
      </div>
      
      <Footer />
    </div>
  );
};

export default PaymentSuccess;