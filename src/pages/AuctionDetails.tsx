import { useParams, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { fetchAuctionById } from "@/api/auctions";
import { ArrowLeft, Heart, Share2, Clock, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";

// ----------------------
// TypeScript interfaces
// ----------------------
interface Bid {
  amount: number;
  bidder: string;
  time: string;
}

interface Dimensions {
  width: number;
  height: number;
  depth: number;
}

interface Auction {
  id: string;
  title: string;
  artist?: string;
  artistName?: string;
  description: string;
  currentBid?: number;
  bidIncrement: number;
  timeRemaining: string;
  image: string;
  status: "live" | "upcoming" | "ended";
  location: string;
  distance: string;
  totalBids: number;
  watchers: number;
  medium: string;
  dimensions: Dimensions | string;
  year: string;
  condition?: string;
  bidHistory?: Bid[];
  startingBid?: number;
  startDate?: string;
  endDate?: string;
}

// Image URL helper function
const getImageUrl = (imagePath: string) => {
  if (!imagePath) return '/placeholder-image.jpg';
  
  console.log('🖼️ AuctionDetails - Processing image:', imagePath);
  
  // If it's already a full URL, return as is
  if (imagePath.startsWith('http')) {
    return imagePath;
  }
  
  // If it's a relative path that should be in S3
  // This is the key fix - construct the proper S3 URL
  const s3BaseUrl = 'https://artburst-images.s3.us-east-1.amazonaws.com';
  
  // Handle different possible path formats
  if (imagePath.startsWith('public/')) {
    return `${s3BaseUrl}/${imagePath}`;
  } else if (imagePath.startsWith('uploads/')) {
    return `${s3BaseUrl}/${imagePath}`;
  } else {
    // Assume it's a public image
    return `${s3BaseUrl}/public/${imagePath}`;
  }
};

// ----------------------
// Component
// ----------------------
const AuctionDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [auction, setAuction] = useState<Auction | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [timeRemaining, setTimeRemaining] = useState("");

  // Calculate time remaining
  const calculateTimeRemaining = (endDate: string) => {
    const end = new Date(endDate);
    const now = new Date();
    const difference = end.getTime() - now.getTime();

    if (difference <= 0) {
      return "Auction ended";
    }

    const days = Math.floor(difference / (1000 * 60 * 60 * 24));
    const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));

    if (days > 0) {
      return `${days}d ${hours}h ${minutes}m`;
    } else if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else {
      return `${minutes}m`;
    }
  };

  // Fetch auction data
  useEffect(() => {
    const loadAuction = async () => {
      setLoading(true);
      try {
        const data = await fetchAuctionById(id!);
        console.log("🖼️ AuctionDetails API Image:", {
          image: data?.image,
          fullData: data
        });
        console.log("Raw API response:", data);
        if (!data) throw new Error("Auction not found");
        
        setAuction(data as Auction);

        // Calculate initial time remaining only if endDate exists
        if (data.endDate) {
          setTimeRemaining(calculateTimeRemaining(data.endDate));
        } else {
          setTimeRemaining(data.timeRemaining || "Time not set");
        }
      } catch (err: any) {
        setError(err.message || "Failed to load auction");
      } finally {
        setLoading(false);
      }
    };
    loadAuction();
  }, [id]);

  // Update time remaining every minute only if endDate exists
  useEffect(() => {
    if (!auction) return;
    
    // Use a type guard to check if endDate exists
    const hasEndDate = (auction: Auction): auction is Auction & { endDate: string } => {
      return 'endDate' in auction && auction.endDate !== undefined;
    };

    if (!hasEndDate(auction)) return;

    const timer = setInterval(() => {
      setTimeRemaining(calculateTimeRemaining(auction.endDate));
    }, 60000);

    return () => clearInterval(timer);
  }, [auction]);

  // Format dimensions helper
  const formatDimensions = (dimensions: Dimensions | string): string => {
    if (typeof dimensions === 'string') {
      return dimensions;
    }
    return `${dimensions.width}" x ${dimensions.height}" x ${dimensions.depth}"`;
  };

  // Placeholder for bidding
  const handlePlaceBid = () => {
    const currentBid = auction?.currentBid || auction?.startingBid || 0;
    alert(`Bid submitted for R${currentBid + auction?.bidIncrement!}`);
  };

  if (loading) return <p className="text-center mt-10">Loading auction...</p>;
  if (error) return <p className="text-center mt-10 text-red-500">{error}</p>;
  if (!auction) return <p className="text-center mt-10">No auction details available.</p>;

  const currentBid = auction.currentBid || auction.startingBid || 0;
  const nextMinBid = currentBid + auction.bidIncrement;
  const displayTimeRemaining = timeRemaining || auction.timeRemaining;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-300 to-gray-500">
      <Header />

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-10 max-w-7xl">
        {/* Back Button */}
        <Button variant="ghost" size="lg" className="mb-6 hover:bg-accent/10 backdrop-blur-xl bg-white/20 border border-white/30" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Auctions
        </Button>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
          {/* Artwork */}
          <div className="space-y-4">
            <div className="relative aspect-square lg:aspect-[4/5] max-w-2xl mx-auto lg:mx-0 overflow-hidden rounded-2xl bg-muted">
              <img
                src={getImageUrl(auction.image)}
                alt={auction.title}
                className="w-full h-full object-cover shadow-2xl"
                onError={(e) => {
                  console.error('❌ Image failed to load in AuctionDetails:', {
                    original: auction.image,
                    processed: e.currentTarget.src
                  });
                  e.currentTarget.src = '/placeholder-image.jpg';
                }}
                onLoad={() => console.log('✅ Image loaded successfully in AuctionDetails:', auction.image)}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent pointer-events-none" />
              <Badge className="absolute top-4 left-4 bg-accent text-white border-0 shadow-lg px-3 py-1.5 backdrop-blur-xl bg-white/20 border border-white/30">
                {auction.status === "live" ? "🔴 Live Auction" : "📅 Upcoming"}
              </Badge>
            </div>

            <div className="flex flex-wrap gap-2 justify-center lg:justify-start">
              <Button variant="outline" size="lg" className="gap-2 backdrop-blur-xl bg-white/20 border border-white/30">
                <Heart className="w-4 h-4" />
                <span>Watch</span>
                <Badge variant="secondary" className="ml-1">{auction.watchers}</Badge>
              </Button>
              <Button variant="outline" size="lg" className="gap-2 backdrop-blur-xl bg-white/20 border border-white/30">
                <Share2 className="w-4 h-4" />
                Share
              </Button>
            </div>
          </div>

          {/* Auction Info */}
          <div className="space-y-6">
            {/* Title & Artist */}
            <div className="text-center lg:text-left">
              <h1 className="font-playfair text-3xl md:text-4xl lg:text-5xl font-bold mb-3 leading-tight">{auction.title}</h1>
              <p className="text-lg md:text-xl text-muted-foreground mb-3">
                by <span className="text-accent font-medium">{auction.artistName || auction.artist || "Unknown Artist"}</span>
              </p>
              <div className="flex items-center justify-center lg:justify-start gap-2 text-sm text-muted-foreground">
                <MapPin className="w-4 h-4 text-accent" />
                <span>{auction.location}</span>
                <span className="text-accent/50">•</span>
                <span>{auction.distance} away</span>
              </div>
            </div>

            {/* Current Bid */}
            <Card className="border-accent/20 shadow-xl bg-gradient-to-br from-accent/5 to-transparent backdrop-blur-xl bg-white/20 border border-white/30">
              <CardContent className="p-6 md:p-8">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6">
                  <div className="text-center sm:text-left">
                    <p className="text-sm text-muted-foreground mb-1">Current Bid</p>
                    <p className="text-4xl md:text-5xl font-bold text-accent">
                      R{currentBid.toLocaleString()}
                    </p>
                  </div>
                  <div className="text-center sm:text-right">
                    <div className="flex items-center justify-center sm:justify-end text-accent mb-1">
                      <Clock className="w-5 h-5 mr-2" />
                      <span className="text-2xl font-bold">{displayTimeRemaining}</span>
                    </div>
                    <p className="text-sm text-muted-foreground">remaining</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row gap-2">
                    <Input
                      placeholder={`Min bid: R${nextMinBid.toLocaleString()}`}
                      className="flex-1 h-12 text-lg backdrop-blur-xl bg-white/20 border border-white/30"
                    />
                    <Button className="btn-primary h-12 px-8 text-lg font-semibold backdrop-blur-xl bg-white/20 border border-white/30" onClick={handlePlaceBid}>
                      Place Bid
                    </Button>
                  </div>
                  <div className="flex justify-between text-sm text-muted-foreground px-1">
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 bg-accent rounded-full"></span>
                      {auction.totalBids} bids
                    </span>
                    <span>Next min: R{nextMinBid.toLocaleString()}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Artwork Details */}
            <Card className="border-accent/10 backdrop-blur-xl bg-white/20 border border-white/30">
              <CardContent className="p-6 md:p-8">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 bg-accent/10 rounded-lg flex items-center justify-center">
                    <span className="text-xl">🎨</span>
                  </div>
                  <h3 className="text-xl font-semibold">Artwork Details</h3>
                </div>
                <div className="grid grid-cols-2 gap-6 text-sm">
                  <div>
                    <p className="text-muted-foreground mb-1">Medium</p>
                    <p className="font-semibold text-base">{auction.medium}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground mb-1">Dimensions</p>
                    <p className="font-semibold text-base">
                      {auction.dimensions ? formatDimensions(auction.dimensions) : "N/A"}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground mb-1">Year</p>
                    <p className="font-semibold text-base">{auction.year}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground mb-1">Condition</p>
                    <p className="font-semibold text-base">{auction.condition || "N/A"}</p>
                  </div>
                </div>
                <div className="mt-6 pt-6 border-t">
                  <p className="text-muted-foreground text-sm font-medium mb-2">Description</p>
                  <p className="text-base leading-relaxed">{auction.description}</p>
                </div>
              </CardContent>
            </Card>

            {/* Bid History */}
            <Card className="border-accent/10 backdrop-blur-xl bg-white/20 border border-white/30">
              <CardContent className="p-6 md:p-8">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 bg-accent/10 rounded-lg flex items-center justify-center">
                    <span className="text-xl">📊</span>
                  </div>
                  <h3 className="text-xl font-semibold">Recent Bids</h3>
                </div>
                <div className="space-y-4">
                  {auction.bidHistory?.map((bid, index) => (
                    <div key={index} className="flex justify-between items-center p-3 rounded-lg hover:bg-accent/5 transition-colors backdrop-blur-xl bg-white/10 border border-white/20">
                      <div>
                        <p className="font-bold text-lg text-accent">R{bid.amount.toLocaleString()}</p>
                        <p className="text-sm text-muted-foreground">{bid.bidder}</p>
                      </div>
                      <p className="text-sm text-muted-foreground">{bid.time}</p>
                    </div>
                  ))}
                  {(!auction.bidHistory || auction.bidHistory.length === 0) && (
                    <div className="text-center py-8">
                      <div className="w-16 h-16 bg-accent/10 rounded-full flex items-center justify-center mx-auto mb-3">
                        <span className="text-2xl">💰</span>
                      </div>
                      <p className="text-muted-foreground">No bids yet</p>
                      <p className="text-sm text-muted-foreground mt-1">Be the first to place a bid!</p>
                    </div>
                  )}
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

export default AuctionDetails;