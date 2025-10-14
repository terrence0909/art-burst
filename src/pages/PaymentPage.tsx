import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { CreditCard, Lock, CheckCircle2, Zap, Shield } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { payfastService } from "@/services/payfastService";

interface Auction {
  id: string;
  title: string;
  artistName: string;
  currentBid: number;
  image: string;
}

const PaymentPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [processing, setProcessing] = useState(false);
  const [auction, setAuction] = useState<Auction | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'payfast' | 'card'>('payfast');

  // Extract real auction data from URL parameters
  useEffect(() => {
    const auctionId = searchParams.get('auctionId');
    const amount = searchParams.get('amount');
    const title = searchParams.get('title');
    const artist = searchParams.get('artist');
    const image = searchParams.get('image');

    console.log('URL Parameters:', { auctionId, amount, title, artist, image });

    if (auctionId && amount && title) {
      setAuction({
        id: auctionId,
        title: decodeURIComponent(title),
        artistName: artist ? decodeURIComponent(artist) : "Artist",
        currentBid: parseFloat(amount),
        image: image || "/api/placeholder/400/300"
      });
    }
  }, [searchParams]);

  const handlePayFastPayment = async () => {
    if (!auction) return;
    
    setProcessing(true);

    try {
      const totalAmount = (auction.currentBid * 1.05).toFixed(2);
      
      const paymentData = {
        amount: totalAmount,
        item_name: `Art: ${auction.title.substring(0, 50)}`,
        item_description: `Artwork by ${auction.artistName}`.substring(0, 255),
        custom_str1: auction.id,
        name_first: "Test",
        name_last: "User", 
        email_address: "test@example.com"
      };

      console.log('💰 Payment Data:', paymentData);
      
      const paymentUrl = payfastService.getPaymentUrl(paymentData);
      console.log('🔗 PayFast URL:', paymentUrl);
      
      // Redirect to PayFast
      window.location.href = paymentUrl;
    } catch (error) {
      console.error('Payment initiation failed:', error);
      alert('Payment setup failed. Please try again.');
      setProcessing(false);
    }
  };

  // Show loading state if auction data isn't available yet
  if (!auction) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-4xl mx-auto">
            <div className="text-center py-16">
              <h1 className="text-2xl font-bold mb-4">Loading...</h1>
              <p className="text-muted-foreground">Preparing your payment details</p>
            </div>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  const totalAmount = auction.currentBid * 1.05;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold mb-2">Complete Your Purchase</h1>
          <p className="text-muted-foreground mb-8">Secure South African payments via PayFast</p>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Payment Methods */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Zap className="w-5 h-5 mr-2" />
                  Payment Method
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {/* PayFast Instant EFT */}
                  <div 
                    onClick={() => setPaymentMethod('payfast')}
                    className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                      paymentMethod === 'payfast' 
                        ? 'border-green-600 bg-green-50 ring-2 ring-green-200' 
                        : 'border-gray-200 hover:border-green-300'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 bg-green-600 rounded-full flex items-center justify-center">
                        <Zap className="w-6 h-6 text-white" />
                      </div>
                      <div className="flex-1">
                        <div className="font-semibold text-gray-900">Instant EFT & Cards</div>
                        <div className="text-sm text-gray-600">Pay instantly with your bank or card</div>
                        <div className="flex space-x-1 mt-1">
                          <Badge variant="secondary" className="text-xs">FNB</Badge>
                          <Badge variant="secondary" className="text-xs">Absa</Badge>
                          <Badge variant="secondary" className="text-xs">Standard</Badge>
                          <Badge variant="secondary" className="text-xs">Nedbank</Badge>
                          <Badge variant="secondary" className="text-xs">Visa</Badge>
                          <Badge variant="secondary" className="text-xs">Mastercard</Badge>
                        </div>
                      </div>
                      {paymentMethod === 'payfast' && (
                        <CheckCircle2 className="w-6 h-6 text-green-600" />
                      )}
                    </div>
                  </div>

                  {/* Credit Card Option (Manual) */}
                  <div 
                    onClick={() => setPaymentMethod('card')}
                    className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                      paymentMethod === 'card' 
                        ? 'border-blue-600 bg-blue-50 ring-2 ring-blue-200' 
                        : 'border-gray-200 hover:border-blue-300'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center">
                        <CreditCard className="w-6 h-6 text-white" />
                      </div>
                      <div className="flex-1">
                        <div className="font-semibold text-gray-900">Manual Processing</div>
                        <div className="text-sm text-gray-600">For testing without PayFast</div>
                        <div className="text-xs text-orange-600 mt-1">
                          Simulated payment - no real transaction
                        </div>
                      </div>
                      {paymentMethod === 'card' && (
                        <CheckCircle2 className="w-6 h-6 text-blue-600" />
                      )}
                    </div>
                  </div>

                  {/* PayFast Payment Button */}
                  {paymentMethod === 'payfast' && (
                    <Button 
                      onClick={handlePayFastPayment}
                      className="w-full bg-green-600 hover:bg-green-700 text-white"
                      disabled={processing}
                      size="lg"
                    >
                      {processing ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Redirecting to PayFast...
                        </>
                      ) : (
                        `Pay R${totalAmount.toLocaleString()} Securely`
                      )}
                    </Button>
                  )}

                  {/* Manual Payment Button */}
                  {paymentMethod === 'card' && (
                    <Button 
                      onClick={() => {
                        setProcessing(true);
                        setTimeout(() => {
                          setProcessing(false);
                          navigate(`/payment-success?auctionId=${auction.id}`);
                        }, 2000);
                      }}
                      className="w-full bg-blue-600 hover:bg-blue-700"
                      disabled={processing}
                      size="lg"
                    >
                      {processing ? "Processing..." : `Simulate Payment R${totalAmount.toLocaleString()}`}
                    </Button>
                  )}
                  
                  <div className="flex items-center justify-center text-sm text-muted-foreground">
                    <Lock className="w-4 h-4 mr-1" />
                    Secured by PayFast • SSL Encrypted
                  </div>

                  {/* Trust Badges */}
                  <div className="grid grid-cols-3 gap-2 pt-4">
                    <div className="text-center p-2 bg-gray-50 rounded-lg">
                      <Shield className="w-6 h-6 text-green-600 mx-auto mb-1" />
                      <div className="text-xs text-gray-600">Secure</div>
                    </div>
                    <div className="text-center p-2 bg-gray-50 rounded-lg">
                      <Zap className="w-6 h-6 text-green-600 mx-auto mb-1" />
                      <div className="text-xs text-gray-600">Instant</div>
                    </div>
                    <div className="text-center p-2 bg-gray-50 rounded-lg">
                      <CreditCard className="w-6 h-6 text-green-600 mx-auto mb-1" />
                      <div className="text-xs text-gray-600">All Banks</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Order Summary */}
            <Card>
              <CardHeader>
                <CardTitle>Order Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div className="flex items-center space-x-4 p-4 bg-muted/30 rounded-lg">
                    <img
                      src={auction.image}
                      alt={auction.title}
                      className="w-16 h-16 object-cover rounded-lg"
                      onError={(e) => {
                        e.currentTarget.src = '/api/placeholder/400/300';
                      }}
                    />
                    <div className="flex-1">
                      <h3 className="font-semibold">{auction.title}</h3>
                      <p className="text-sm text-muted-foreground">by {auction.artistName}</p>
                      <Badge variant="secondary" className="mt-1">
                        Winning Bid
                      </Badge>
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm py-2">
                      <span>Item Price</span>
                      <span className="font-medium">R{auction.currentBid.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-sm py-2">
                      <span>Service Fee (5%)</span>
                      <span className="font-medium">R{(auction.currentBid * 0.05).toLocaleString()}</span>
                    </div>
                    <div className="border-t pt-3 flex justify-between font-semibold text-lg">
                      <span>Total Amount</span>
                      <span className="text-green-600">R{totalAmount.toLocaleString()}</span>
                    </div>
                  </div>

                  {/* PayFast Benefits */}
                  <div className="bg-green-50 rounded-lg p-4 space-y-2">
                    <h4 className="font-semibold text-green-800 flex items-center">
                      <Zap className="w-4 h-4 mr-2" />
                      Why PayFast?
                    </h4>
                    <div className="flex items-center text-sm text-green-700">
                      <CheckCircle2 className="w-4 h-4 mr-2" />
                      <span>Instant payment confirmation</span>
                    </div>
                    <div className="flex items-center text-sm text-green-700">
                      <Shield className="w-4 h-4 mr-2" />
                      <span>Bank-level security</span>
                    </div>
                    <div className="flex items-center text-sm text-green-700">
                      <CreditCard className="w-4 h-4 mr-2" />
                      <span>All major South African banks</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default PaymentPage;