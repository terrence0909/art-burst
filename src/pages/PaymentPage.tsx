import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { CreditCard, Lock, CheckCircle2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";

interface PaymentForm {
  cardNumber: string;
  expiryDate: string;
  cvv: string;
  cardholderName: string;
  saveCard: boolean;
}

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
  const [success, setSuccess] = useState(false);
  const [auction, setAuction] = useState<Auction | null>(null);

  const [paymentForm, setPaymentForm] = useState<PaymentForm>({
    cardNumber: "",
    expiryDate: "",
    cvv: "",
    cardholderName: "",
    saveCard: false
  });

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

  const handleInputChange = (field: keyof PaymentForm, value: string | boolean) => {
    setPaymentForm(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const formatCardNumber = (value: string) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    const matches = v.match(/\d{4,16}/g);
    const match = matches ? matches[0] : '';
    const parts = [];
    
    for (let i = 0; i < match.length; i += 4) {
      parts.push(match.substring(i, i + 4));
    }
    
    return parts.length ? parts.join(' ') : value;
  };

  const handleCardNumberChange = (value: string) => {
    const formatted = formatCardNumber(value);
    handleInputChange('cardNumber', formatted);
  };

  const formatExpiryDate = (value: string) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    if (v.length >= 2) {
      return `${v.substring(0, 2)}/${v.substring(2, 4)}`;
    }
    return value;
  };

  const handleExpiryDateChange = (value: string) => {
    const formatted = formatExpiryDate(value);
    handleInputChange('expiryDate', formatted);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auction) return;
    
    setProcessing(true);
    
    // Simulate payment processing
    setTimeout(() => {
      setProcessing(false);
      setSuccess(true);
    }, 2000);
  };

  if (success) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto px-4 py-16">
          <div className="max-w-md mx-auto text-center">
            <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h1 className="text-2xl font-bold mb-2">Payment Successful!</h1>
            <p className="text-muted-foreground mb-6">
              Thank you for your purchase. You will receive a confirmation email shortly.
            </p>
            <div className="space-y-3">
              <Button 
                className="w-full" 
                onClick={() => navigate(`/auction/${auction?.id}`)}
              >
                View Auction
              </Button>
              <Button 
                variant="outline" 
                className="w-full" 
                onClick={() => navigate('/')}
              >
                Continue Shopping
              </Button>
            </div>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

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

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold mb-8">Complete Your Purchase</h1>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Payment Form */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <CreditCard className="w-5 h-5 mr-2" />
                  Payment Information
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="cardholderName">Cardholder Name</Label>
                    <Input
                      id="cardholderName"
                      placeholder="John Doe"
                      value={paymentForm.cardholderName}
                      onChange={(e) => handleInputChange('cardholderName', e.target.value)}
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="cardNumber">Card Number</Label>
                    <Input
                      id="cardNumber"
                      placeholder="1234 5678 9012 3456"
                      value={paymentForm.cardNumber}
                      onChange={(e) => handleCardNumberChange(e.target.value)}
                      maxLength={19}
                      required
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="expiryDate">Expiry Date</Label>
                      <Input
                        id="expiryDate"
                        placeholder="MM/YY"
                        value={paymentForm.expiryDate}
                        onChange={(e) => handleExpiryDateChange(e.target.value)}
                        maxLength={5}
                        required
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="cvv">CVV</Label>
                      <Input
                        id="cvv"
                        placeholder="123"
                        value={paymentForm.cvv}
                        onChange={(e) => handleInputChange('cvv', e.target.value.replace(/[^0-9]/g, ''))}
                        maxLength={3}
                        required
                      />
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="saveCard"
                      checked={paymentForm.saveCard}
                      onChange={(e) => handleInputChange('saveCard', e.target.checked)}
                      className="rounded"
                    />
                    <Label htmlFor="saveCard" className="text-sm">
                      Save card for future purchases
                    </Label>
                  </div>
                  
                  <Button 
                    type="submit" 
                    className="w-full" 
                    disabled={processing}
                  >
                    {processing ? "Processing..." : `Pay R${auction.currentBid.toLocaleString()}`}
                  </Button>
                  
                  <div className="flex items-center justify-center text-sm text-muted-foreground">
                    <Lock className="w-4 h-4 mr-1" />
                    Your payment is secure and encrypted
                  </div>
                </form>
              </CardContent>
            </Card>

            {/* Order Summary */}
            <Card>
              <CardHeader>
                <CardTitle>Order Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center space-x-4">
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
                  
                  <div className="border-t pt-4 space-y-2">
                    <div className="flex justify-between">
                      <span>Item Price</span>
                      <span>R{auction.currentBid.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Service Fee (5%)</span>
                      <span>R{(auction.currentBid * 0.05).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Shipping</span>
                      <span>R0</span>
                    </div>
                    <div className="border-t pt-2 flex justify-between font-semibold">
                      <span>Total</span>
                      <span>R{(auction.currentBid * 1.05).toLocaleString()}</span>
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