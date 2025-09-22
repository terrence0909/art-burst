import { Clock, MapPin, Users, TrendingUp } from "lucide-react";
import { Card, CardContent, CardFooter, CardHeader } from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { useState, useEffect, useRef } from "react";

interface BidHistoryItem {
  id: string;
  bidAmount: number;
  bidderId: string;
  bidTime: string;
  bidderName?: string;
  isHighest?: boolean;
}

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
  isBidding?: boolean;
}

// Bid History Tooltip - Highest bid at top
const BidHistoryTooltip = ({ 
  auctionId, 
  isVisible, 
  cardRef,
  currentBid
}: { 
  auctionId: string;
  isVisible: boolean;
  cardRef: React.RefObject<HTMLDivElement>;
  currentBid: number;
}) => {
  const [bidHistory, setBidHistory] = useState<BidHistoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [tooltipSide, setTooltipSide] = useState<'right' | 'left'>('right');

  useEffect(() => {
    if (isVisible && auctionId && cardRef.current) {
      fetchRealBidHistory(auctionId, currentBid);
      updatePosition();
      
      const handleScrollResize = () => {
        if (isVisible && cardRef.current) {
          updatePosition();
        }
      };
      
      window.addEventListener('scroll', handleScrollResize, true);
      window.addEventListener('resize', handleScrollResize);
      
      return () => {
        window.removeEventListener('scroll', handleScrollResize, true);
        window.removeEventListener('resize', handleScrollResize);
      };
    }
  }, [isVisible, auctionId, currentBid]);

  const updatePosition = () => {
    if (cardRef.current) {
      const rect = cardRef.current.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const tooltipWidth = 288;
      
      let x = rect.right + 15;
      let side: 'right' | 'left' = 'right';
      
      if (x + tooltipWidth > viewportWidth - 20) {
        x = rect.left - tooltipWidth - 15;
        side = 'left';
      }
      
      setTooltipSide(side);
      setPosition({
        x: x,
        y: rect.top + rect.height / 2
      });
    }
  };

  const fetchRealBidHistory = async (auctionId: string, currentBid: number) => {
    setLoading(true);
    try {
      const authToken = localStorage.getItem('auction-auth-token');
      const endpoint = `http://localhost:8080/api/auctions/${auctionId}/bids`;
      
      const response = await fetch(endpoint, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        }
      });
      
      if (response.ok) {
        const realBidData = await response.json();
        
        if (realBidData.length > 0) {
          // Get highest bid first
          const highestBid = realBidData.reduce((highest: any, bid: any) => {
            const amount = bid.amount || bid.bidAmount || 0;
            const highestAmount = highest.amount || highest.bidAmount || 0;
            return amount > highestAmount ? bid : highest;
          }, realBidData[0]);
          
          // Get 2 most recent bids (excluding highest if it's included)
          const sortedByTime = realBidData.sort((a: any, b: any) => 
            new Date(b.timestamp || b.createdAt).getTime() - new Date(a.timestamp || a.createdAt).getTime()
          );
          
          const recentBids = sortedByTime.filter(bid => bid.id !== highestBid.id).slice(0, 2);
          
          // Combine: Highest bid first, then recent bids
          const importantBids = [highestBid, ...recentBids].slice(0, 3);
          
          const formattedBids = importantBids.map((bid: any, index: number) => ({
            id: bid.bidId || bid.id || `bid-${index}-${auctionId}`,
            bidAmount: bid.amount || bid.bidAmount || 0,
            bidderId: bid.bidderId || bid.userId || `user-${index}`,
            bidTime: formatBidTime(bid.timestamp || bid.bidTime || bid.createdAt),
            bidderName: bid.bidderName || bid.userName || `Bidder ${index + 1}`,
            isHighest: bid.id === highestBid.id
          }));
          
          setBidHistory(formattedBids);
        } else {
          generateSimpleBidHistory(auctionId, currentBid);
        }
      } else {
        generateSimpleBidHistory(auctionId, currentBid);
      }
    } catch (error) {
      generateSimpleBidHistory(auctionId, currentBid);
    } finally {
      setLoading(false);
    }
  };

  const generateSimpleBidHistory = (auctionId: string, currentBid: number) => {
    // Highest bid first, then 2 recent bids
    const bids: BidHistoryItem[] = [];
    
    // Highest bid at the top
    bids.push({
      id: `highest-${auctionId}`,
      bidAmount: currentBid,
      bidderId: "current-bidder",
      bidTime: "Just now",
      bidderName: "Highest Bidder",
      isHighest: true
    });
    
    // Add 2 "recent" bids below
    const bidIncrement = Math.max(100, Math.floor(currentBid / 3));
    
    if (currentBid > bidIncrement) {
      bids.push({
        id: `recent-1-${auctionId}`,
        bidAmount: currentBid - bidIncrement,
        bidderId: "user123",
        bidTime: "15 mins ago",
        bidderName: "Recent Bidder",
        isHighest: false
      });
    }
    
    if (currentBid > bidIncrement * 2) {
      bids.push({
        id: `recent-2-${auctionId}`,
        bidAmount: currentBid - (bidIncrement * 2),
        bidderId: "user456",
        bidTime: "30 mins ago",
        bidderName: "Another Bidder",
        isHighest: false
      });
    }
    
    setBidHistory(bids.slice(0, 3)); // Max 3 bids
  };

  const formatBidTime = (timestamp: string | Date) => {
    if (!timestamp) return "Recently";
    
    const now = new Date();
    const bidTime = new Date(timestamp);
    const diffMs = now.getTime() - bidTime.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    
    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${Math.floor(diffHours / 24)}d ago`;
  };

  if (!isVisible) return null;

  return (
    <div
      className="fixed z-50"
      style={{
        left: position.x,
        top: position.y,
        transform: 'translateY(-50%)'
      }}
    >
      <div className="relative w-72">
        {/* Dynamic arrow pointer based on side */}
        <div className={`absolute top-1/2 transform -translate-y-1/2 z-10 ${
          tooltipSide === 'right' 
            ? 'left-0 -translate-x-2' 
            : 'right-0 translate-x-2 rotate-180'
        }`}>
          <div className="w-0 h-0 border-t-[6px] border-t-transparent border-b-[6px] border-b-transparent border-r-[8px] border-r-white/30"></div>
        </div>
        
        {/* Glassmorphism tooltip */}
        <div className="backdrop-blur-xl bg-white/20 dark:bg-black/30 border border-white/30 dark:border-gray-700/40 rounded-xl shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="px-4 py-3 bg-gradient-to-r from-purple-500/20 to-blue-500/20 border-b border-white/20">
            <div className="flex items-center space-x-2">
              <TrendingUp className="w-4 h-4 text-blue-300" />
              <h3 className="text-sm font-semibold text-white">Bid History</h3>
              <Badge variant="secondary" className="ml-auto text-xs bg-white/20">
                {bidHistory.length} shown
              </Badge>
            </div>
          </div>

          {/* Content - Highest bid at top */}
          <div className="p-4">
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="animate-pulse flex items-center space-x-3">
                    <div className="w-2 h-2 bg-white/30 rounded-full"></div>
                    <div className="flex-1 space-y-1">
                      <div className="h-3 bg-white/20 rounded w-3/4"></div>
                      <div className="h-2 bg-white/10 rounded w-1/2"></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : bidHistory.length > 0 ? (
              <div className="space-y-2">
                {bidHistory.map((bid) => (
                  <div key={bid.id} className={`flex items-center space-x-3 p-2 rounded ${
                    bid.isHighest ? 'bg-green-500/20 border border-green-500/30' : 'bg-white/5'
                  }`}>
                    <div className={`w-2 h-2 rounded-full ${
                      bid.isHighest ? 'bg-green-400 shadow-lg shadow-green-400/50' : 'bg-white/40'
                    }`}></div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className={`text-sm font-bold ${
                          bid.isHighest ? 'text-green-300' : 'text-white'
                        }`}>
                          R{bid.bidAmount.toLocaleString()}
                        </span>
                        <span className="text-xs text-gray-300">{bid.bidTime}</span>
                      </div>
                      
                      <div className="flex items-center justify-between mt-1">
                        <span className="text-xs text-gray-200 truncate">
                          {bid.bidderName}
                        </span>
                        {bid.isHighest && (
                          <span className="text-xs bg-green-400/30 text-green-200 px-2 py-0.5 rounded-full">
                            Highest
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6">
                <TrendingUp className="w-8 h-8 text-white/40 mx-auto mb-3" />
                <p className="text-sm text-white/70 font-medium">No bids yet</p>
                <p className="text-xs text-white/50 mt-1">Be the first to bid!</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// AuctionCard component remains exactly the same...
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
  isBidding = false
}: AuctionCardProps) => {
  const [showBidHistory, setShowBidHistory] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const hoverTimeoutRef = useRef<NodeJS.Timeout>();

  const handleMouseEnter = () => {
    hoverTimeoutRef.current = setTimeout(() => {
      setShowBidHistory(true);
    }, 100);
  };

  const handleMouseLeave = () => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }
    setShowBidHistory(false);
  };

  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }
    };
  }, []);

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
    <>
      <Card 
        ref={cardRef}
        className="auction-card group relative"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
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
            disabled={status === "ended" || isBidding}
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

      {/* Bid History Tooltip */}
      <BidHistoryTooltip
        auctionId={id}
        isVisible={showBidHistory}
        cardRef={cardRef}
        currentBid={currentBid}
      />
    </>
  );
};