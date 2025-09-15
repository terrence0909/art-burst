import { AuctionCard } from "./AuctionCard";
import { useAuctions } from "../hooks/useAuctions";
import { useState, useEffect, useCallback, useRef } from "react";
import { useToast } from "@/hooks/use-toast";
import { realtimeService, BidUpdate } from "../services/realtime";
import { wsService, WebSocketMessage } from "../services/websocket";

export const AuctionGrid = () => {
  const { toast } = useToast();
  const { auctions, loading, error, refetch, setAuctions } = useAuctions();
  const [isPlacingBid, setIsPlacingBid] = useState(false);
  const [biddingAuctionId, setBiddingAuctionId] = useState<string | null>(null);
  
  // Keep track of current user to avoid showing notifications for own bids
  const currentUserIdRef = useRef<string | null>(null);
  const unsubscribeFunctionsRef = useRef<Set<() => void>>(new Set());

  // Get current user ID
  useEffect(() => {
    const userKeys = Object.keys(localStorage).filter(
      (key) => key.includes("Cognito") && key.includes("LastAuthUser")
    );
    currentUserIdRef.current = userKeys.length > 0 ? localStorage.getItem(userKeys[0]) : null;
  }, []);

  // Handle real-time bid updates
  const handleBidUpdate = useCallback((update: BidUpdate | WebSocketMessage, source: 'polling' | 'websocket') => {
    console.log(`Received ${source} update:`, update);
    
    let auctionId: string;
    let bidAmount: number | undefined;
    let bidderId: string | undefined;
    let newBidCount: number | undefined;
    
    // Handle different update formats
    if ('type' in update && update.type === 'AUCTION_UPDATE') {
      // Polling update
      auctionId = update.auctionId;
      bidAmount = update.bid?.bidAmount;
      bidderId = update.bid?.userId;
      newBidCount = update.auction?.bidCount;
    } else if ('type' in update && (update.type === 'NEW_BID' || update.type === 'AUCTION_UPDATE')) {
      // WebSocket update
      auctionId = update.auctionId!;
      bidAmount = update.bid?.bidAmount;
      bidderId = update.bid?.userId;
      newBidCount = update.auction?.bidCount;
    } else {
      return;
    }

    // Update local auction state
    setAuctions(prevAuctions => 
      prevAuctions.map(auction => {
        if (auction.auctionId === auctionId) {
          const updatedAuction = { ...auction };
          
          if (bidAmount !== undefined) {
            updatedAuction.currentBid = bidAmount;
          }
          if (newBidCount !== undefined) {
            updatedAuction.bidders = newBidCount;
          }
          
          return updatedAuction;
        }
        return auction;
      })
    );

    // Show toast notification if it's not the current user's bid
    if (bidAmount && bidderId && bidderId !== currentUserIdRef.current) {
      const auction = auctions.find(a => a.auctionId === auctionId);
      const auctionTitle = auction?.title || 'Unknown Auction';
      
      toast({
        title: "New Bid Placed! 🎯",
        description: `Someone bid R${bidAmount.toLocaleString()} on "${auctionTitle}"`,
        duration: 4000,
      });
    }
  }, [auctions, setAuctions, toast]);

  // Set up real-time subscriptions for all auctions
  useEffect(() => {
    if (auctions.length === 0) return;

    // Clear existing subscriptions
    unsubscribeFunctionsRef.current.forEach(unsubscribe => unsubscribe());
    unsubscribeFunctionsRef.current.clear();

    // Use polling for real-time updates (WebSocket optional)
    const setupSubscriptions = async () => {
      // Check if WebSocket URL is configured
      const hasWebSocketUrl = import.meta.env.VITE_WEBSOCKET_URL && 
                              import.meta.env.VITE_WEBSOCKET_URL !== 'wss://your-websocket-api.execute-api.region.amazonaws.com/dev';

      if (hasWebSocketUrl) {
        try {
          // Attempt WebSocket connection
          if (!wsService.isConnected()) {
            await wsService.connect();
          }

          // Subscribe to each auction via WebSocket
          auctions.forEach(auction => {
            const unsubscribeWs = wsService.subscribe(auction.auctionId, (message) => {
              handleBidUpdate(message, 'websocket');
            });
            unsubscribeFunctionsRef.current.add(unsubscribeWs);
          });

          console.log('WebSocket subscriptions established');
          return; // Exit if WebSocket works
        } catch (error) {
          console.warn('WebSocket failed, falling back to polling:', error);
        }
      }
      
      // Use polling (always works with your existing API)
      auctions.forEach(auction => {
        const unsubscribePolling = realtimeService.subscribe(auction.auctionId, (update) => {
          handleBidUpdate(update, 'polling');
        });
        unsubscribeFunctionsRef.current.add(unsubscribePolling);
      });

      console.log('Polling subscriptions established');
    };

    setupSubscriptions();

    // Cleanup function
    return () => {
      unsubscribeFunctionsRef.current.forEach(unsubscribe => unsubscribe());
      unsubscribeFunctionsRef.current.clear();
    };
  }, [auctions, handleBidUpdate]);

  // Cleanup on component unmount
  useEffect(() => {
    return () => {
      unsubscribeFunctionsRef.current.forEach(unsubscribe => unsubscribe());
      realtimeService.destroy();
    };
  }, []);

  // Function to handle bid placement
  const handlePlaceBid = async (auctionId: string) => {
    const auction = auctions.find((a) => a.auctionId === auctionId);
    if (!auction) return;

    setBiddingAuctionId(auctionId);
    
    const currentBid = auction.currentBid || auction.startingBid || 0;
    const minBid = currentBid + 1;
    
    const bidAmountStr = prompt(`Enter your bid amount (minimum: R${minBid.toLocaleString()})`);
    if (!bidAmountStr) {
      setBiddingAuctionId(null);
      return;
    }

    const bidAmount = Number(bidAmountStr.replace(/[^0-9.]/g, ''));

    if (isNaN(bidAmount) || bidAmount < minBid) {
      toast({
        title: "Invalid Bid Amount",
        description: `Bid must be at least R${minBid.toLocaleString()}`,
        variant: "destructive",
      });
      setBiddingAuctionId(null);
      return;
    }

    setIsPlacingBid(true);

    try {
      // Get token from localStorage
      const tokenKeys = Object.keys(localStorage).filter(
        (key) => key.includes("Cognito") && key.includes("idToken")
      );

      if (tokenKeys.length === 0) {
        toast({
          title: "Login Required",
          description: "Please log in to place a bid",
          variant: "destructive",
        });
        setIsPlacingBid(false);
        setBiddingAuctionId(null);
        return;
      }

      const token = localStorage.getItem(tokenKeys[0])!;

      // Get user ID from localStorage
      const userKeys = Object.keys(localStorage).filter(
        (key) => key.includes("Cognito") && key.includes("LastAuthUser")
      );
      const userId = userKeys.length > 0 ? localStorage.getItem(userKeys[0])! : "unknown-user";

      const response = await fetch(
        "https://v3w12ytklh.execute-api.us-east-1.amazonaws.com/prod/auctions/bid",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            auctionId,
            bidAmount,
            bidderId: userId,
          }),
        }
      );

      const data = await response.json();

      if (response.ok) {
        toast({
          title: "Bid Placed Successfully! 🎉",
          description: `Your bid of R${bidAmount.toLocaleString()} has been placed`,
        });
        
        // IMMEDIATE UI UPDATE - Update local state
        setAuctions(prevAuctions => 
          prevAuctions.map(auction => 
            auction.auctionId === auctionId 
              ? { 
                  ...auction, 
                  currentBid: bidAmount,
                  bidders: (auction.bidders || 0) + 1
                }
              : auction
          )
        );
        
        // Then refetch to ensure data is in sync
        await refetch();
      } else {
        toast({
          title: "Bid Failed",
          description: data.message || "Unknown error occurred",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Bid error:", error);
      toast({
        title: "Error",
        description: "Error placing bid. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsPlacingBid(false);
      setBiddingAuctionId(null);
    }
  };

  if (loading) {
    return (
      <section className="py-16 bg-muted/30">
        <div className="container px-4 text-center">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-300 rounded w-1/4 mx-auto mb-4"></div>
            <div className="h-4 bg-gray-300 rounded w-1/2 mx-auto mb-12"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-80 bg-gray-300 rounded-lg"></div>
              ))}
            </div>
          </div>
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="py-16 bg-muted/30">
        <div className="container px-4 text-center">
          <p className="text-red-500 mb-4">Error loading auctions: {error}</p>
          <button
            onClick={refetch}
            className="bg-blue-500 text-white px-6 py-2 rounded hover:bg-blue-600 transition-colors"
          >
            Try Again
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="py-16 bg-muted/30">
      <div className="container px-4">
        <div className="text-center mb-12">
          <h2 className="font-playfair text-4xl font-bold mb-4">
            Current Auctions Near You
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Discover unique artwork from talented local artists. Place your bids
            and become part of your city's vibrant art community.
          </p>
        </div>

        {auctions.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground text-lg mb-4">
              No auctions available at the moment.
            </p>
            <button
              onClick={refetch}
              className="bg-blue-500 text-white px-6 py-2 rounded hover:bg-blue-600 transition-colors"
            >
              Check Again
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {auctions.map((auction) => (
              <AuctionCard
                key={auction.auctionId}
                id={auction.auctionId}
                title={auction.title}
                artist={auction.artistName || "Unknown Artist"} 
                currentBid={auction.currentBid || auction.startingBid || 0}
                timeRemaining={auction.timeRemaining || ""}
                location={auction.location || ""}
                bidders={auction.bidders ?? 0}
                image={auction.image || ""}
                status={auction.status}
                onPlaceBid={handlePlaceBid}
                isBidding={biddingAuctionId === auction.auctionId && isPlacingBid}
              />
            ))}
          </div>
        )}

        {isPlacingBid && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-lg flex items-center gap-3">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500"></div>
              <p>Placing your bid...</p>
            </div>
          </div>
        )}
      </div>
    </section>
  );
};