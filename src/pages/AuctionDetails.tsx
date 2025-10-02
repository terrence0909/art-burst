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
    <div className="min-h-screen bg-background">
      <Header />

      <div className="container mx-auto px-4 py-8">
        {/* Back Button */}
        <Button variant="ghost" className="mb-6" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Auctions
        </Button>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Artwork */}
          <div className="space-y-4">
            <div className="relative">
              <img
                src={auction.image}
                alt={auction.title}
                className="w-full rounded-lg shadow-luxury frame-luxury"
              />
              <Badge className="absolute top-4 left-4 bg-accent text-accent-foreground">
                {auction.status === "live" ? "Live Auction" : "Upcoming"}
              </Badge>
            </div>

            <div className="flex space-x-2">
              <Button variant="outline" size="sm">
                <Heart className="w-4 h-4 mr-2" />
                Watch ({auction.watchers})
              </Button>
              <Button variant="outline" size="sm">
                <Share2 className="w-4 h-4 mr-2" />
                Share
              </Button>
            </div>
          </div>

          {/* Auction Info */}
          <div className="space-y-6">
            {/* Title & Artist */}
            <div>
              <h1 className="font-playfair text-3xl font-bold mb-2">{auction.title}</h1>
              <p className="text-lg text-muted-foreground">
                by {auction.artistName || auction.artist || "Unknown Artist"}
              </p>
              <div className="flex items-center mt-2 text-sm text-muted-foreground">
                <MapPin className="w-4 h-4 mr-1" />
                {auction.location} • {auction.distance} away
              </div>
            </div>

            {/* Current Bid */}
            <Card className="border-accent">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Current Bid</p>
                    <p className="text-3xl font-bold text-accent">
                      R{currentBid.toLocaleString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center text-accent">
                      <Clock className="w-4 h-4 mr-1" />
                      <span className="font-semibold">{displayTimeRemaining}</span>
                    </div>
                    <p className="text-sm text-muted-foreground">remaining</p>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex space-x-2">
                    <Input
                      placeholder={`Min bid: R${nextMinBid.toLocaleString()}`}
                      className="flex-1"
                    />
                    <Button className="btn-primary" onClick={handlePlaceBid}>
                      Place Bid
                    </Button>
                  </div>
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>{auction.totalBids} bids</span>
                    <span>Next min: R{nextMinBid.toLocaleString()}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Artwork Details */}
            <Card>
              <CardContent className="p-6">
                <h3 className="font-semibold mb-4">Artwork Details</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Medium</p>
                    <p className="font-medium">{auction.medium}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Dimensions</p>
                    <p className="font-medium">
                      {auction.dimensions ? formatDimensions(auction.dimensions) : "N/A"}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Year</p>
                    <p className="font-medium">{auction.year}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Condition</p>
                    <p className="font-medium">{auction.condition || "N/A"}</p>
                  </div>
                </div>
                <div className="mt-4">
                  <p className="text-muted-foreground text-sm">Description</p>
                  <p className="mt-1">{auction.description}</p>
                </div>
              </CardContent>
            </Card>

            {/* Bid History */}
            <Card>
              <CardContent className="p-6">
                <h3 className="font-semibold mb-4">Recent Bids</h3>
                <div className="space-y-3">
                  {auction.bidHistory?.map((bid, index) => (
                    <div key={index} className="flex justify-between items-center">
                      <div>
                        <p className="font-medium">R{bid.amount.toLocaleString()}</p>
                        <p className="text-sm text-muted-foreground">{bid.bidder}</p>
                      </div>
                      <p className="text-sm text-muted-foreground">{bid.time}</p>
                    </div>
                  ))}
                  {(!auction.bidHistory || auction.bidHistory.length === 0) && (
                    <p className="text-muted-foreground text-center">No bids yet</p>
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