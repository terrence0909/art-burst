import { Clock, MapPin, Users } from "lucide-react";
import { Card, CardContent, CardFooter, CardHeader } from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";

interface AuctionCardProps {
  id: string;
  title: string;
  artist: string;
  currentBid: number;
  timeRemaining: string;
  location: string;
  bidders?: number;
  image: string;
  status: "live" | "upcoming" | "ended";
  distance?: string;
  onPlaceBid?: (auctionId: string) => void;
  isBidding?: boolean; // Added isBidding prop
}

export const AuctionCard = ({
  id,
  title,
  artist,
  currentBid,
  timeRemaining,
  location,
  bidders = 0,
  image,
  status,
  distance,
  onPlaceBid,
  isBidding = false // Added isBidding with default value
}: AuctionCardProps) => {
  const getStatusBadge = () => {
    switch (status) {
      case "live":
        return <Badge className="status-live">● LIVE</Badge>;
      case "upcoming":
        return <Badge className="status-upcoming">UPCOMING</Badge>;
      case "ended":
        return <Badge className="status-ended">ENDED</Badge>;
    }
  };

  return (
    <Card className="auction-card group">
      <CardHeader className="p-0">
        <div className="artwork-frame">
          <img src={image} alt={title} />
          <div className="absolute top-3 left-3">
            {getStatusBadge()}
          </div>
          <div className="absolute top-3 right-3">
            <Badge className="location-badge">
              <MapPin className="w-3 h-3 mr-1" />
              {location}
            </Badge>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="p-4">
        <h3 className="font-playfair font-semibold text-lg mb-1 text-foreground">
          {title}
        </h3>
        <p className="text-muted-foreground text-sm mb-3">
          by {artist}
        </p>
        
        <div className="flex justify-between items-center mb-3">
          <div>
            <p className="text-xs text-muted-foreground">Current Bid</p>
            <p className="text-xl font-bold text-gradient">
              R{currentBid?.toLocaleString() || '0'}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Time Left</p>
            <p className="text-sm font-medium flex items-center">
              <Clock className="w-3 h-3 mr-1" />
              {timeRemaining}
            </p>
          </div>
        </div>
        
        <div className="flex items-center text-xs text-muted-foreground mb-4">
          <Users className="w-3 h-3 mr-1" />
          {bidders} bidder{bidders !== 1 ? 's' : ''}
        </div>
      </CardContent>
      
      <CardFooter className="p-4 pt-0">
        <Button 
          className="w-full btn-primary"
          disabled={status === "ended" || isBidding} // Disable when bidding
          onClick={() => onPlaceBid?.(id)}
        >
          {isBidding ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Placing Bid...
            </>
          ) : status === "ended" ? (
            "Auction Ended"
          ) : (
            "Place Bid"
          )}
        </Button>
      </CardFooter>
    </Card>
  );
};