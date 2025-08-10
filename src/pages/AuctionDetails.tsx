import { useParams } from "react-router-dom";
import { ArrowLeft, Heart, Share2, Clock, Users, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import artwork1 from "@/assets/artwork-1.jpeg";

const AuctionDetails = () => {
  const { id } = useParams();

  // Mock auction data - would come from API
  const auction = {
    id: id,
    title: "Sunset Over Silicon Valley",
    artist: "Maria Rodriguez",
    description: "A vibrant oil painting capturing the golden hour over the tech capital of the world. This piece represents the intersection of nature and innovation, painted from the artist's studio overlooking the valley.",
    currentBid: 2450,
    startingBid: 500,
    bidIncrement: 50,
    timeRemaining: "2h 45m",
    endTime: "2024-03-15T18:00:00Z",
    image: artwork1,
    status: "live",
    location: "San Francisco, CA",
    distance: "2.3 miles",
    dimensions: "24\" x 36\"",
    medium: "Oil on Canvas",
    year: "2024",
    totalBids: 23,
    watchers: 47,
    condition: "Excellent",
    provenance: "Direct from artist's studio",
    bidHistory: [
      { amount: 2450, bidder: "Anonymous", time: "2 minutes ago" },
      { amount: 2400, bidder: "ArtLover123", time: "5 minutes ago" },
      { amount: 2350, bidder: "CollectorSF", time: "12 minutes ago" },
    ]
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <div className="container mx-auto px-4 py-8">
        {/* Back Button */}
        <Button variant="ghost" className="mb-6">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Auctions
        </Button>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Artwork Image */}
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
            
            {/* Action Buttons */}
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

          {/* Auction Details */}
          <div className="space-y-6">
            <div>
              <h1 className="font-playfair text-3xl font-bold mb-2">{auction.title}</h1>
              <p className="text-lg text-muted-foreground">by {auction.artist}</p>
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
                    <p className="text-3xl font-bold text-accent">R{auction.currentBid.toLocaleString()}</p>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center text-accent">
                      <Clock className="w-4 h-4 mr-1" />
                      <span className="font-semibold">{auction.timeRemaining}</span>
                    </div>
                    <p className="text-sm text-muted-foreground">remaining</p>
                  </div>
                </div>

                {/* Bidding Interface */}
                <div className="space-y-3">
                  <div className="flex space-x-2">
                    <Input 
                      placeholder={`Min bid: $${(auction.currentBid + auction.bidIncrement).toLocaleString()}`}
                      className="flex-1"
                    />
                    <Button className="btn-primary">Place Bid</Button>
                  </div>
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>{auction.totalBids} bids</span>
                    <span>Next min: R{(auction.currentBid + auction.bidIncrement).toLocaleString()}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Artwork Info */}
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
                    <p className="font-medium">{auction.dimensions}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Year</p>
                    <p className="font-medium">{auction.year}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Condition</p>
                    <p className="font-medium">{auction.condition}</p>
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
                  {auction.bidHistory.map((bid, index) => (
                    <div key={index} className="flex justify-between items-center">
                      <div>   
                        <p className="font-medium">R{bid.amount.toLocaleString()}</p>
                        <p className="text-sm text-muted-foreground">{bid.bidder}</p>
                      </div>
                      <p className="text-sm text-muted-foreground">{bid.time}</p>
                    </div>
                  ))}
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

