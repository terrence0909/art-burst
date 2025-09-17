import { AuctionCard } from "./AuctionCard";
import { useAuctions } from "../hooks/useAuctions";
import { useState, useEffect, useCallback, useRef } from "react";
import { useToast } from "@/hooks/use-toast";
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

  // Handle real-time bid updates from WebSocket
  const handleBidUpdate = useCallback((message: WebSocketMessage) => {
    console.log('WebSocket message received:', message);
    
    // Handle Lambda response format (message with bid/auction fields)
    if (message.message === "Bid placed successfully" && message.bid && message.auction) {
      const { bid, auction } = message;
      const bidAmount = bid.bidAmount;
      const bidderId = bid.userId;
      const auctionId = bid.auctionId || auction.auctionId;
      
      console.log('Processing successful bid response:', { auctionId, bidAmount, bidderId });

      // Update local auction state
      setAuctions(prevAuctions => 
        prevAuctions.map(prevAuction => 
          prevAuction.auctionId === auctionId 
            ? { 
                ...prevAuction, 
                currentBid: bidAmount,
                bidders: (prevAuction.bidders || 0) + 1
              }
            : prevAuction
        )
      );

      // Show success toast
      toast({
        title: "Bid Placed Successfully! 🎉",
        description: `Your bid of R${bidAmount.toLocaleString()} has been placed`,
      });

    } 
    // Handle NEW_BID format (for real-time updates from other users)
    else if (message.type === "NEW_BID" && message.auctionId && message.bid) {
      const { auctionId, bid, auction } = message;
      const bidAmount = bid.bidAmount;
      const bidderId = bid.userId;
      
      console.log('Processing real-time bid update:', { auctionId, bidAmount, bidderId });

      // Update local auction state
      setAuctions(prevAuctions => 
        prevAuctions.map(prevAuction => 
          prevAuction.auctionId === auctionId 
            ? { 
                ...prevAuction, 
                currentBid: bidAmount,
                bidders: auction?.bidCount || (prevAuction.bidders || 0) + 1
              }
            : prevAuction
        )
      );

      // Show toast notification if it's not the current user's bid
      if (bidAmount && bidderId && bidderId !== currentUserIdRef.current) {
        const updatedAuction = auctions.find(a => a.auctionId === auctionId);
        const auctionTitle = updatedAuction?.title || 'Unknown Auction';
        
        toast({
          title: "New Bid Placed! 🎯",
          description: `Someone bid R${bidAmount.toLocaleString()} on "${auctionTitle}"`,
          duration: 4000,
        });
      }
    } else if (message.type === "AUCTION_UPDATE") {
      // Handle other update types if needed
      console.log('Auction update received:', message);
    }
  }, [auctions, setAuctions, toast]);

  // Set up WebSocket subscriptions for all auctions
  useEffect(() => {
    if (auctions.length === 0) return;

    console.log('Setting up WebSocket subscriptions for', auctions.length, 'auctions');

    // Clear existing subscriptions
    unsubscribeFunctionsRef.current.forEach(unsubscribe => unsubscribe());
    unsubscribeFunctionsRef.current.clear();

    const setupWebSocketSubscriptions = async () => {
      try {
        // Attempt WebSocket connection if not connected
        if (!wsService.isConnected()) {
          console.log('Connecting to WebSocket...');
          await wsService.connect();
          console.log('WebSocket connected successfully');
        }

        // Subscribe to each auction via WebSocket
        auctions.forEach(auction => {
          const unsubscribeWs = wsService.subscribe(auction.auctionId, (message) => {
            console.log('WebSocket message for auction', auction.auctionId, ':', message);
            handleBidUpdate(message);
          });
          unsubscribeFunctionsRef.current.add(unsubscribeWs);
        });

        console.log('WebSocket subscriptions established');

      } catch (error) {
        console.error('WebSocket connection failed:', error);
        // Don't fall back to polling - WebSockets are the primary method
      }
    };

    setupWebSocketSubscriptions();

    // Cleanup function
    return () => {
      unsubscribeFunctionsRef.current.forEach(unsubscribe => unsubscribe());
      unsubscribeFunctionsRef.current.clear();
    };
  }, [auctions, handleBidUpdate]);

  // Debug WebSocket connection on component mount
  useEffect(() => {
    console.log('WebSocket connection status:', wsService.isConnected());
    console.log('WebSocket URL:', import.meta.env.VITE_WEBSOCKET_URL);
  }, []);

  // Function to handle bid placement via WebSocket
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
      // Get user ID from localStorage
      const userKeys = Object.keys(localStorage).filter(
        (key) => key.includes("Cognito") && key.includes("LastAuthUser")
      );
      const userId = userKeys.length > 0 ? localStorage.getItem(userKeys[0])! : "unknown-user";

      // Use WebSocket to place bid instead of REST API
      if (wsService.isConnected()) {
        // Send bid via WebSocket
        wsService.sendMessage({
          action: 'placeBid',
          auctionId,
          bidAmount,
          bidderId: userId
        });

        // Show immediate optimistic UI update
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

        toast({
          title: "Placing Bid...",
          description: `Your bid of R${bidAmount.toLocaleString()} is being processed`,
        });

      } else {
        // Fallback: try to connect WebSocket
        console.log('WebSocket not connected, attempting to connect...');
        await wsService.connect();
        
        if (wsService.isConnected()) {
          // Retry sending the bid
          wsService.sendMessage({
            action: 'placeBid',
            auctionId,
            bidAmount,
            bidderId: userId
          });

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

          toast({
            title: "Placing Bid...",
            description: `Your bid of R${bidAmount.toLocaleString()} is being processed`,
          });
        } else {
          throw new Error('WebSocket connection failed');
        }
      }
    } catch (error) {
      console.error("Bid error:", error);
      toast({
        title: "Error",
        description: "Error placing bid. Please try again.",
        variant: "destructive",
      });
      
      // Revert optimistic update if it failed
      await refetch();
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

        {/* Test button for WebSocket messages */}
        <div className="fixed bottom-4 right-4 z-50">
          <button
            onClick={() => {
              // Simulate receiving a WebSocket message with correct type
              const testMessage: WebSocketMessage = {
                type: "NEW_BID",
                auctionId: auctions[0]?.auctionId || "test-auction-id",
                bid: {
                  bidAmount: 1000,
                  userId: "test-user-123",
                  bidTime: new Date().toISOString(),
                  bidId: "test-bid-123"
                },
                auction: {
                  currentBid: 1000,
                  highestBidder: "test-user-123",
                  bidCount: 10,
                  title: auctions[0]?.title || "Test Auction",
                  artistName: auctions[0]?.artistName || "Test Artist"
                },
                timestamp: new Date().toISOString()
              };
              handleBidUpdate(testMessage);
              toast({
                title: "Test Message Sent",
                description: "Check console for WebSocket test",
              });
            }}
            className="bg-green-500 text-white px-4 py-2 rounded text-sm hover:bg-green-600 transition-colors"
          >
            Test WebSocket
          </button>
        </div>
      </div>
    </section>
  );
};