import { Clock, MapPin, Users, TrendingUp, Info, Trophy, AlertCircle } from "lucide-react";
import { Card, CardContent, CardFooter, CardHeader } from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuctionCompletion } from "../hooks/useAuctionCompletion";
import { getCurrentUser } from 'aws-amplify/auth';
import { bidHistoryManager } from "../services/bidHistoryManager";

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
  artistId?: string;
  currentBid: number;
  timeRemaining: string;
  location: string;
  bidders?: number;
  image: string;
  status: "live" | "upcoming" | "ended" | "closed";
  distance?: string;
  onPlaceBid?: (auctionId: string) => void;
  isBidding?: boolean;
  endDate?: string;
  startDate?: string;
  currentUserId?: string;
  highestBidder?: string;
  canPlaceBid?: boolean;
  compact?: boolean;
}

const BidHistoryTooltip = ({ 
  auctionId, 
  isVisible, 
  cardRef,
  currentBid,
  onClose
}: { 
  auctionId: string;
  isVisible: boolean;
  cardRef: React.RefObject<HTMLDivElement>;
  currentBid: number;
  onClose?: () => void;
}) => {
  const [bidHistory, setBidHistory] = useState<BidHistoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [tooltipSide, setTooltipSide] = useState<'right' | 'left'>('right');
  const tooltipRef = useRef<HTMLDivElement>(null);
  const hasFetchedRef = useRef(false);

  const stableAuctionId = useMemo(() => auctionId, [auctionId]);

  const updatePosition = useCallback(() => {
    if (!cardRef.current) return;

    const rect = cardRef.current.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const tooltipWidth = 288;
    const tooltipHeight = 300;
    
    if (viewportWidth <= 768) {
      setPosition({
        x: (viewportWidth - tooltipWidth) / 2,
        y: Math.min(rect.bottom + 10, viewportHeight - tooltipHeight - 20)
      });
      setTooltipSide('right');
    } else {
      let x = rect.right + 15;
      let side: 'right' | 'left' = 'right';
      
      if (x + tooltipWidth > viewportWidth - 20) {
        x = rect.left - tooltipWidth - 15;
        side = 'left';
      }
      
      setTooltipSide(prev => prev !== side ? side : prev);
      setPosition(prev => 
        prev.x !== x || prev.y !== rect.top + rect.height / 2 
          ? { x, y: rect.top + rect.height / 2 } 
          : prev
      );
    }
  }, [cardRef]);

  const formatTime = (bidTime: string) => {
    try {
      const date = new Date(bidTime);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      
      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return `${diffMins}m ago`;
      const diffHours = Math.floor(diffMins / 60);
      if (diffHours < 24) return `${diffHours}h ago`;
      const diffDays = Math.floor(diffHours / 24);
      return `${diffDays}d ago`;
    } catch {
      return 'Recently';
    }
  };

  const fetchRealBidHistory = useCallback(() => {
    if (loading || hasFetchedRef.current) return;
    
    setLoading(true);
    hasFetchedRef.current = true;
    
    try {
      const realBids = bidHistoryManager.getBidHistory(auctionId, 5);
      
      if (realBids.length > 0) {
        const formattedBids = realBids.map((bid, index) => ({
          id: bid.bidId,
          bidAmount: bid.bidAmount,
          bidderId: bid.bidderId,
          bidTime: formatTime(bid.bidTime),
          bidderName: bid.bidderName || `Bidder ${bid.bidderId.slice(-6)}`,
          isHighest: index === 0
        }));
        
        setBidHistory(formattedBids);
      } else {
        setBidHistory([]);
      }
    } catch (error) {
      setBidHistory([]);
    } finally {
      setLoading(false);
    }
  }, [auctionId, loading]);

  useEffect(() => {
    if (isVisible && stableAuctionId) {
      fetchRealBidHistory();
      
      const interval = setInterval(() => {
        hasFetchedRef.current = false;
        setLoading(false);
        fetchRealBidHistory();
      }, 2000);
      
      return () => clearInterval(interval);
    }
  }, [isVisible, stableAuctionId, fetchRealBidHistory]);

  useEffect(() => {
    if (!isVisible || !cardRef.current) return;

    updatePosition();
    
    const handleScrollResize = () => {
      updatePosition();
    };
    
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (tooltipRef.current && !tooltipRef.current.contains(event.target as Node) &&
          cardRef.current && !cardRef.current.contains(event.target as Node)) {
        onClose?.();
      }
    };
    
    window.addEventListener('scroll', handleScrollResize, true);
    window.addEventListener('resize', handleScrollResize);
    document.addEventListener('click', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    
    return () => {
      window.removeEventListener('scroll', handleScrollResize, true);
      window.removeEventListener('resize', handleScrollResize);
      document.removeEventListener('click', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
      hasFetchedRef.current = false;
    };
  }, [isVisible, onClose, updatePosition, cardRef]);

  if (!isVisible) return null;

  const isMobile = window.innerWidth <= 768;

  return (
    <div
      ref={tooltipRef}
      className="fixed z-50"
      style={{
        left: position.x,
        top: position.y,
        transform: isMobile ? 'none' : 'translateY(-50%)'
      }}
    >
      <div className="relative w-72">
        {!isMobile && (
          <div className={`absolute top-1/2 transform -translate-y-1/2 z-10 ${
            tooltipSide === 'right' 
              ? 'left-0 -translate-x-2' 
              : 'right-0 translate-x-2 rotate-180'
          }`}>
            <div className="w-0 h-0 border-t-[6px] border-t-transparent border-b-[6px] border-b-transparent border-r-[8px] border-r-white/30"></div>
          </div>
        )}
        
        <div className="backdrop-blur-xl bg-white/20 dark:bg-black/30 border border-white/30 dark:border-gray-700/40 rounded-xl shadow-2xl overflow-hidden">
          <div className="px-4 py-3 bg-gradient-to-r from-purple-500/20 to-blue-500/20 border-b border-white/20">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <TrendingUp className="w-4 h-4 text-blue-300" />
                <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Live Bid History</h3>
                <Badge variant="secondary" className="text-xs bg-white/20 text-gray-800 dark:text-gray-200">
                  {bidHistory.length} bids
                </Badge>
              </div>
              {isMobile && (
                <button
                  onClick={onClose}
                  className="text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white text-lg font-bold ml-2"
                >
                  ×
                </button>
              )}
            </div>
          </div>

          <div className="p-4">
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="animate-pulse flex items-center space-x-3">
                    <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                    <div className="flex-1 space-y-1">
                      <div className="h-3 bg-gray-300 rounded w-3/4"></div>
                      <div className="h-2 bg-gray-200 rounded w-1/2"></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : bidHistory.length > 0 ? (
              <div className="space-y-2">
                {bidHistory.map((bid) => (
                  <div key={bid.id} className={`flex items-center space-x-3 p-2 rounded ${
                    bid.isHighest ? 'bg-green-500/20 border border-green-500/30' : 'bg-gray-100/30 dark:bg-gray-800/30'
                  }`}>
                    <div className={`w-2 h-2 rounded-full ${
                      bid.isHighest ? 'bg-green-400 shadow-lg shadow-green-400/50' : 'bg-gray-500'
                    }`}></div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className={`text-sm font-bold ${
                          bid.isHighest ? 'text-green-700 dark:text-green-300' : 'text-gray-800 dark:text-gray-200'
                        }`}>
                          R{bid.bidAmount.toLocaleString()}
                        </span>
                        <span className="text-xs text-gray-600 dark:text-gray-400">{bid.bidTime}</span>
                      </div>
                      
                      <div className="flex items-center justify-between mt-1">
                        <span className="text-xs text-gray-700 dark:text-gray-300 truncate">
                          {bid.bidderName}
                        </span>
                        {bid.isHighest && (
                          <span className="text-xs bg-green-400/30 text-green-700 dark:text-green-300 px-2 py-0.5 rounded-full flex items-center">
                            <Trophy className="w-3 h-3 mr-1" />
                            Leading
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6">
                <TrendingUp className="w-8 h-8 text-gray-400 mx-auto mb-3" />
                <p className="text-sm text-gray-700 dark:text-gray-300 font-medium">No bids yet</p>
                <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">Be the first to bid!</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export const AuctionCard = ({
  id,
  title,
  artist,
  artistId,
  currentBid,
  timeRemaining,
  location,
  bidders = 0,
  image,
  status,
  distance,
  onPlaceBid,
  isBidding = false,
  endDate,
  startDate,
  currentUserId,
  highestBidder,
  canPlaceBid = true,
  compact = false
}: AuctionCardProps) => {
  const navigate = useNavigate();
  const [showBidHistory, setShowBidHistory] = useState(false);
  const [imageError, setImageError] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const checkAuth = async () => {
      try {
        setAuthLoading(true);
        const user = await getCurrentUser();
        if (mounted) {
          setIsAuthenticated(true);
          setAuthLoading(false);
        }
      } catch (error) {
        if (mounted) {
          setIsAuthenticated(false);
          setAuthLoading(false);
        }
      }
    };

    checkAuth();
    const interval = setInterval(checkAuth, 3000);

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  const actualEndTime = useMemo(() => {
    if (endDate && new Date(endDate).toString() !== 'Invalid Date') {
      return endDate;
    }
    return null;
  }, [endDate]);

  const { auctionStatus, timeUntilEnd, isAuctionActive, timeUntilStart } = useAuctionCompletion({
    auctionId: id,
    endDate: actualEndTime || endDate || "",
    startDate: startDate || "",
    currentBid,
    isHighestBidder: currentUserId === highestBidder,
    auctionTitle: title,
    status: status
  });

  const actualStatus = auctionStatus;
  const isUserHighestBidder = currentUserId === highestBidder;

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768 || 'ontouchstart' in window);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const handleMouseEnter = useCallback(() => {
    if (!isMobile) {
      hoverTimeoutRef.current = setTimeout(() => {
        setShowBidHistory(true);
      }, 300);
    }
  }, [isMobile]);

  const handleMouseLeave = useCallback(() => {
    if (!isMobile) {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }
      setShowBidHistory(false);
    }
  }, [isMobile]);

  const handleBidHistoryToggle = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setShowBidHistory(prev => !prev);
  }, []);

  const handleCloseBidHistory = useCallback(() => {
    setShowBidHistory(false);
  }, []);

  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }
    };
  }, []);

  const getStatusBadge = useCallback(() => {
    switch (actualStatus) {
      case "live":
        return <Badge className={`status-live ${compact ? 'md:px-2 md:py-0.5 md:text-xs' : ''}`}>● LIVE</Badge>;
      case "upcoming":
        return <Badge className={`status-upcoming ${compact ? 'md:px-2 md:py-0.5 md:text-xs' : ''}`}>UPCOMING</Badge>;
      case "ended":
        if (isUserHighestBidder) {
          return <Badge className={`bg-green-500 text-white ${compact ? 'md:px-2 md:py-0.5 md:text-xs' : ''}`}><Trophy className="w-3 h-3 mr-1" />WON</Badge>;
        }
        return <Badge className={`status-ended ${compact ? 'md:px-2 md:py-0.5 md:text-xs' : ''}`}>ENDED</Badge>;
      case "closed":
        return <Badge className={`bg-purple-600 text-white ${compact ? 'md:px-2 md:py-0.5 md:text-xs' : ''}`}>SOLD</Badge>;
      default:
        return <Badge className={`status-upcoming ${compact ? 'md:px-2 md:py-0.5 md:text-xs' : ''}`}>UNKNOWN</Badge>;
    }
  }, [actualStatus, isUserHighestBidder, compact]);

  const formatTimeRemaining = useCallback(() => {
    if (actualStatus === 'ended') {
      return 'Auction Ended';
    }
    
    if (actualStatus === 'upcoming') {
      if (!timeUntilStart || timeUntilStart <= 0) {
        return 'Starting soon';
      }
      
      const days = Math.floor(timeUntilStart / (1000 * 60 * 60 * 24));
      const hours = Math.floor((timeUntilStart % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((timeUntilStart % (1000 * 60 * 60)) / (1000 * 60));
      
      if (days > 0) {
        return `Starts in ${days}d ${hours}h`;
      } else if (hours > 0) {
        return `Starts in ${hours}h ${minutes}m`;
      } else if (minutes > 0) {
        return `Starts in ${minutes}m`;
      } else {
        return 'Starting soon';
      }
    }
    
    if (actualStatus === 'live') {
      if (!timeUntilEnd || timeUntilEnd <= 0) {
        return 'Ending soon';
      }
      
      const hours = Math.floor(timeUntilEnd / (1000 * 60 * 60));
      const minutes = Math.floor((timeUntilEnd % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((timeUntilEnd % (1000 * 60)) / 1000);
      
      if (hours > 0) {
        return `${hours}h ${minutes}m`;
      } else if (minutes > 0) {
        return `${minutes}m ${seconds}s`;
      } else if (seconds > 0) {
        return `${seconds}s`;
      } else {
        return 'Ending soon';
      }
    }
    
    return timeRemaining;
  }, [actualStatus, timeUntilStart, timeUntilEnd, timeRemaining]);

  const getButtonState = useCallback(() => {
    if (isBidding) {
      return {
        disabled: true,
        text: (
          <>
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
            Placing Bid...
          </>
        ),
        className: "w-full btn-primary"
      };
    }

    if (isUserHighestBidder && (actualStatus === "ended" || status === "ended")) {
      return {
        disabled: false,
        text: (
          <>
            <Trophy className="w-4 h-4 mr-2" />
            You Won! Pay Now
          </>
        ),
        className: "w-full bg-green-600 hover:bg-green-700 text-white",
        onClick: () => {
          navigate(`/payment?auctionId=${id}&amount=${currentBid}&title=${encodeURIComponent(title)}&artist=${encodeURIComponent(artist)}&image=${image}`);
        }
      };
    }

    if (actualStatus === "ended" || status === "ended") {
      return {
        disabled: true,
        text: "Auction Ended",
        className: "w-full bg-gray-500 text-gray-300 cursor-not-allowed"
      };
    }

    if (actualStatus === "closed" || status === "closed") {
      return {
        disabled: true,
        text: "Sold",
        className: "w-full bg-purple-600 text-white cursor-not-allowed"
      };
    }

    if (actualStatus === "upcoming") {
      return {
        disabled: true,
        text: "Starts Soon",
        className: "w-full bg-gray-400 text-gray-200 cursor-not-allowed"
      };
    }

    if (authLoading) {
      return {
        disabled: true,
        text: "Checking...",
        className: "w-full bg-gray-400 text-gray-200 cursor-not-allowed"
      };
    }

    if (!isAuthenticated) {
      return {
        disabled: true,
        text: "Place Bid",
        className: "w-full bg-gray-400 text-gray-200 cursor-not-allowed"
      };
    }

    if (!canPlaceBid) {
      return {
        disabled: true,
        text: "Place Bid",
        className: "w-full bg-gray-400 text-gray-200 cursor-not-allowed"
      };
    }

    return {
      disabled: false,
      text: "Place Bid",
      className: "w-full btn-primary",
      onClick: () => onPlaceBid?.(id)
    };
  }, [isAuthenticated, authLoading, isBidding, actualStatus, status, isUserHighestBidder, id, currentBid, title, artist, image, onPlaceBid, canPlaceBid, navigate]);

  const buttonState = getButtonState();
  const formattedBid = currentBid ? currentBid.toLocaleString() : '0';

  return (
    <>
      <Card 
        ref={cardRef}
        className={`auction-card group relative ${actualStatus === 'ended' ? 'opacity-90' : ''} ${compact ? 'md:h-full' : ''}`}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <CardHeader className="p-0">
          <div className="artwork-frame">
            <img 
              src={imageError ? '/placeholder-image.jpg' : image} 
              alt={title} 
              onError={() => setImageError(true)}
            />
            {actualStatus === 'ended' && (
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                <div className="text-center">
                  {isUserHighestBidder ? (
                    <>
                      <Trophy className="w-12 h-12 text-yellow-400 mx-auto mb-2" />
                      <p className="text-white font-bold text-lg">You Won!</p>
                      <p className="text-green-400 font-semibold">R{formattedBid}</p>
                    </>
                  ) : (
                    <>
                      <AlertCircle className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                      <p className="text-white font-bold">Auction Ended</p>
                      <p className="text-gray-300 text-sm">Final: R{formattedBid}</p>
                    </>
                  )}
                </div>
              </div>
            )}
            <div className="absolute top-3 left-3">
              {getStatusBadge()}
            </div>
            <div className="absolute top-3 right-3 flex items-center space-x-2">
              <Badge className={`location-badge ${compact ? 'md:px-2 md:py-0.5 md:text-xs' : ''}`}>
                <MapPin className={`${compact ? 'md:w-3 md:h-3' : 'w-3 h-3'} mr-1`} />
                {location}
              </Badge>
              {isMobile && (
                <button
                  onClick={handleBidHistoryToggle}
                  className="bg-black/30 backdrop-blur-sm text-white p-1.5 rounded-full hover:bg-black/50 transition-colors"
                  aria-label="View bid history"
                >
                  <Info className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>
        </CardHeader>
        
        <CardContent className={`${compact ? 'p-4 md:p-3' : 'p-4'}`}>
          <h3 className={`font-playfair font-semibold ${compact ? 'text-lg md:text-base' : 'text-lg'} mb-1 text-foreground`}>
            {title}
          </h3>
          <p className={`text-muted-foreground ${compact ? 'text-sm md:text-xs' : 'text-sm'} mb-3`}>
            by{" "}
            {artistId ? (
              <Link 
                to={`/artist/${artistId}`}
                className="text-muted-foreground hover:text-accent transition-colors"
                onClick={(e) => e.stopPropagation()}
              >
                {artist}
              </Link>
            ) : (
              <span>{artist}</span>
            )}
          </p>
          
          <div className="flex justify-between items-center mb-3">
            <div>
              <p className={`${compact ? 'text-xs md:text-xs' : 'text-xs'} text-muted-foreground`}>
                {actualStatus === 'ended' ? 'Final Bid' : 'Current Bid'}
              </p>
              <p className={`${compact ? 'text-xl md:text-lg' : 'text-xl'} font-bold ${
                isUserHighestBidder && actualStatus === 'ended' 
                  ? 'text-green-600' 
                  : 'text-gradient'
              }`}>
                R{formattedBid}
              </p>
            </div>
            <div className="text-right">
              <p className={`${compact ? 'text-xs md:text-xs' : 'text-xs'} text-muted-foreground`}>
                {actualStatus === 'ended' ? 'Status' : actualStatus === 'upcoming' ? 'Starts In' : 'Time Left'}
              </p>
              <p className={`${compact ? 'text-sm md:text-xs' : 'text-sm'} font-medium flex items-center ${
                actualStatus === 'ended' ? 'text-gray-600' : ''
              } ${timeUntilEnd < 300000 && actualStatus === 'live' ? 'text-red-500 animate-pulse' : ''}`}>
                <Clock className={`${compact ? 'md:w-3 md:h-3' : 'w-3 h-3'} mr-1`} />
                {formatTimeRemaining()}
              </p>
            </div>
          </div>
          
          <div className={`flex items-center justify-between ${compact ? 'text-xs md:text-xs' : 'text-xs'} text-muted-foreground mb-4`}>
            <div className="flex items-center">
              <Users className={`${compact ? 'md:w-3 md:h-3' : 'w-3 h-3'} mr-1`} />
              {bidders} bidder{bidders !== 1 ? 's' : ''}
            </div>
            {isMobile && (
              <button
                onClick={handleBidHistoryToggle}
                className="flex items-center text-blue-500 hover:text-blue-400 transition-colors"
              >
                <TrendingUp className="w-3 h-3 mr-1" />
                View History
              </button>
            )}
            {isUserHighestBidder && actualStatus === 'live' && (
              <span className="text-green-600 font-semibold text-xs">
                <Trophy className="w-3 h-3 inline mr-1" />
                You're Winning!
              </span>
            )}
          </div>
        </CardContent>
        
        <CardFooter className={`${compact ? 'p-4 md:p-3 md:pt-0' : 'p-4 pt-0'}`}>
          <Button 
            className={buttonState.className}
            disabled={buttonState.disabled}
            onClick={buttonState.onClick}
          >
            {buttonState.text}
          </Button>
        </CardFooter>
      </Card>

      <BidHistoryTooltip
        auctionId={id}
        isVisible={showBidHistory}
        cardRef={cardRef}
        currentBid={currentBid}
        onClose={handleCloseBidHistory}
      />
    </>
  );
};