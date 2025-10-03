import { useNavigate } from "react-router-dom";
import { XCircle, ArrowLeft, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";

const PaymentCancelled = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-md mx-auto text-center">
          <XCircle className="w-20 h-20 text-orange-500 mx-auto mb-6" />
          
          <h1 className="text-3xl font-bold mb-4">Payment Cancelled</h1>
          
          <Card className="mb-6">
            <CardContent className="pt-6">
              <p className="text-muted-foreground mb-4">
                Your payment was cancelled. No charges have been made to your account.
              </p>
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                <p className="text-sm text-orange-800">
                  You can try again anytime. Your auction bid is still active.
                </p>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-3">
            <Button 
              className="w-full" 
              onClick={() => navigate(-2)} // Go back to payment page
            >
              Try Payment Again
            </Button>
            
            <Button 
              variant="outline" 
              className="w-full" 
              onClick={() => navigate('/')}
            >
              <Home className="w-4 h-4 mr-2" />
              Back to Home
            </Button>
          </div>
        </div>
      </div>
      
      <Footer />
    </div>
  );
};

export default PaymentCancelled;