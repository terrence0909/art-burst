// src/components/AuctionGrid.tsx
import { AuctionCard } from "./AuctionCard";
import { useAuctions } from "../hooks/useAuctions";
import { useState, useEffect, useCallback, useRef } from "react";
import { useToast } from "@/hooks/use-toast";
import { createWebSocketService, WebSocketMessage } from "../services/websocket";
import { useParams } from 'react-router-dom';

export const AuctionGrid = () => {
  const { toast } = useToast();
  const { auctions, loading, error, refetch, updateAuction } = useAuctions();
  const [isPlacingBid, setIsPlacingBid] = useState(false);
  const [biddingAuctionId, setBiddingAuctionId] = useState<string | null>(null);
  const [currentUserId] = useState(() => `user-${Math.random().toString(36).substring(2, 10)}`);
  const [wsService, setWsService] = useState<any>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionAttempts, setConnectionAttempts] = useState(0);
  const [authToken, setAuthToken] = useState<string | null>(null);
  const hasSubscribedRef = useRef(false);
  const processedBidsRef = useRef<Set<string>>(new Set());
  const lastToastTimeRef = useRef(0);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const wsServiceRef = useRef<any>(null);
  const pendingBidsRef = useRef<Set<string>>(new Set()); // Track pending bids

  const { auctionId: routeAuctionId } = useParams();

  // Generate/get auth token
  useEffect(() => {
    let token = localStorage.getItem('auction-auth-token');
    if (!token) {
      token = `auth-${currentUserId}-${Date.now()}`;
      localStorage.setItem('auction-auth-token', token);
    }
    setAuthToken(token);
    console.log('🔐 Using auth token:', token.substring(0, 20) + '...');
  }, [currentUserId]);

  // WebSocket connection with retry
  const connectWebSocket = useCallback(async () => {
    if (!authToken) return;
    if (wsServiceRef.current?.isConnected()) return;

    try {
      if (!wsServiceRef.current) {
        const service = createWebSocketService('*', currentUserId, authToken);
        wsServiceRef.current = service;
        setWsService(service);

        const statusCheck = setInterval(() => {
          setIsConnected(service.isConnected());
        }, 2000);
        (window as any).__auctionStatusCheck = statusCheck;
      }

      await wsServiceRef.current.connect();
      setConnectionAttempts(0);
      setIsConnected(true);

      toast({ title: "🔌 Connected", description: "Real-time updates enabled", duration: 2000 });

    } catch (error: any) {
      setConnectionAttempts(prev => prev + 1);
      setIsConnected(false);

      if (error?.message?.includes('403')) {
        const newToken = `auth-${currentUserId}-${Date.now()}`;
        localStorage.setItem('auction-auth-token', newToken);
        setAuthToken(newToken);
        toast({ title: "🔐 Refreshing Authentication", description: "Updating credentials...", duration: 3000 });
        return;
      }

      const delay = Math.min(1000 * Math.pow(2, connectionAttempts), 30000);
      if (connectionAttempts < 10) {
        toast({ title: "📡 Connection Failed", description: `Retrying in ${delay / 1000}s...`, variant: "destructive", duration: 3000 });
        reconnectTimeoutRef.current = setTimeout(connectWebSocket, delay);
      } else {
        toast({ title: "❌ Connection Failed", description: "Please refresh the page", variant: "destructive", duration: 0 });
      }
    }
  }, [authToken, currentUserId, connectionAttempts, toast]);

  useEffect(() => {
    if (authToken) connectWebSocket();
    return () => {
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      if ((window as any).__auctionStatusCheck) clearInterval((window as any).__auctionStatusCheck);
    };
  }, [authToken, connectWebSocket]);

  // Heartbeat
  useEffect(() => {
    if (!wsServiceRef.current) return;
    const interval = setInterval(async () => {
      if (!wsServiceRef.current.isConnected()) return connectWebSocket();
      try { await wsServiceRef.current.sendMessage({ action: 'ping', timestamp: Date.now() }); } 
      catch { connectWebSocket(); }
    }, 25000);
    return () => clearInterval(interval);
  }, [connectWebSocket]);

  // Handle bid updates - FIXED: Don't revert optimistic updates
  const handleBidUpdate = useCallback((message: WebSocketMessage) => {
    if (message.message?.includes('Subscription') || message.message?.includes('Subscribed')) return;

    if (message.action === 'bidUpdate' && message.bid && message.auctionId) {
      const { bidAmount, bidderId, bidTime } = message.bid;
      const auctionId = message.auctionId;

      const messageId = `${auctionId}-${bidAmount}-${bidTime}`;
      if (processedBidsRef.current.has(messageId)) return;
      processedBidsRef.current.add(messageId);
      if (processedBidsRef.current.size > 100) {
        processedBidsRef.current = new Set(Array.from(processedBidsRef.current).slice(-50));
      }

      const currentAuction = auctions.find(a => a.auctionId === auctionId);
      if (!currentAuction) return;

      // Check if this is a pending bid we already optimistically updated
      const pendingBidKey = `${auctionId}-${bidderId}`;
      const wasMyPendingBid = pendingBidsRef.current.has(pendingBidKey);
      
      // Remove from pending
      if (wasMyPendingBid) {
        pendingBidsRef.current.delete(pendingBidKey);
      }

      const previousHighestBidder = currentAuction.highestBidder;
      const wasMyBid = bidderId === currentUserId;
      const isNewHighestBidder = bidderId !== previousHighestBidder;

      // Calculate new bidder count
      let newBidderCount = currentAuction.bidders || 0;
      if (isNewHighestBidder && !wasMyPendingBid) {
        // Only increment if this is a new bidder AND we didn't already optimistically update
        newBidderCount += 1;
      }

      // CRITICAL: Always update to the latest bid info from server
      updateAuction(auctionId, {
        currentBid: bidAmount,
        bidders: newBidderCount,
        highestBidder: bidderId
      });

      const now = Date.now();
      if (now - lastToastTimeRef.current > 1000) {
        let toastTitle = "";
        let toastDescription = "";

        if (wasMyBid) {
          if (!wasMyPendingBid) {
            // Only show success toast if we didn't already show it optimistically
            toastTitle = "🎉 Bid Confirmed!";
            toastDescription = `Your bid of R${bidAmount.toLocaleString()} on "${currentAuction.title}" is confirmed`;
          }
        } else {
          // Someone else placed a bid
          toastTitle = "🔥 New Bid Alert!";
          toastDescription = `R${bidAmount.toLocaleString()} bid placed on "${currentAuction.title}"`;
          
          toast({ 
            title: toastTitle, 
            description: toastDescription, 
            duration: 4000 
          });
          lastToastTimeRef.current = now;
        }
      }
    }
  }, [updateAuction, toast, currentUserId, auctions]);

  // Subscribe
  useEffect(() => {
    if (!wsServiceRef.current) return;
    const subscribe = () => {
      if (wsServiceRef.current.isConnected() && !hasSubscribedRef.current) {
        const unsubscribe = wsServiceRef.current.subscribe('*', handleBidUpdate);
        hasSubscribedRef.current = true;
        (window as any).__auctionUnsubscribe = unsubscribe;
        console.log('🔔 Subscribed to auction updates');
      }
    };
    subscribe();
    const interval = setInterval(subscribe, 3000);
    return () => { 
      clearInterval(interval); 
      if ((window as any).__auctionUnsubscribe) { 
        (window as any).__auctionUnsubscribe(); 
        hasSubscribedRef.current = false; 
      } 
    };
  }, [handleBidUpdate]);

  // Place bid - FIXED: Better optimistic updates
  const handlePlaceBid = async (auctionId: string) => {
    if (isPlacingBid) {
      toast({ title: "⏳ Please Wait", description: "Previous bid still processing...", duration: 2000 });
      return;
    }
    
    if (!authToken) {
      toast({ title: "❌ Authentication Required", description: "Please wait for authentication to complete", variant: "destructive" });
      return;
    }

    const auction = auctions.find(a => a.auctionId === auctionId);
    if (!auction) {
      toast({ title: "❌ Error", description: "Auction not found", variant: "destructive" });
      return;
    }

    setBiddingAuctionId(auctionId);
    setIsPlacingBid(true);

    try {
      const currentBid = auction.currentBid || auction.startingBid || 0;
      const minBid = currentBid + (auction.bidIncrement || 100);
      const bidAmountStr = prompt(`💰 Place your bid on "${auction.title}"\nCurrent bid: R${currentBid.toLocaleString()}\nMinimum bid: R${minBid.toLocaleString()}`);
      
      if (!bidAmountStr) {
        throw new Error("Bid cancelled by user");
      }

      const bidAmount = Number(bidAmountStr.replace(/[^0-9.]/g, ''));
      if (isNaN(bidAmount) || bidAmount < minBid) {
        throw new Error(`Bid must be at least R${minBid.toLocaleString()}`);
      }

      // Mark this bid as pending
      const pendingBidKey = `${auctionId}-${currentUserId}`;
      pendingBidsRef.current.add(pendingBidKey);

      // Optimistic update - only increment bidders if I wasn't already the highest bidder
      const isNewBidder = auction.highestBidder !== currentUserId;
      updateAuction(auctionId, {
        currentBid: bidAmount,
        bidders: isNewBidder ? (auction.bidders || 0) + 1 : auction.bidders,
        highestBidder: currentUserId
      });

      // Show optimistic success toast
      toast({ 
        title: "🎉 Bid Placed!", 
        description: `Placing bid of R${bidAmount.toLocaleString()}...`, 
        duration: 3000 
      });

      // Send bid to server
      if (wsServiceRef.current?.isConnected()) {
        await wsServiceRef.current.placeBid(auctionId, bidAmount, currentUserId);
      } else {
        const response = await fetch('https://x3ikd4thrj6qe3dwys2vbeo3ba0yondc.lambda-url.us-east-1.on.aws/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ auctionId, bidAmount, bidderId: currentUserId, authToken })
        });
        
        if (!response.ok) {
          throw new Error(`Bid failed: ${response.status}`);
        }
        
        // Server confirmation will come through WebSocket, don't update again here
      }

    } catch (error: any) {
      console.error('Bid error:', error);
      
      // Remove from pending on error
      const pendingBidKey = `${auctionId}-${currentUserId}`;
      pendingBidsRef.current.delete(pendingBidKey);
      
      // Revert optimistic update by refetching
      await refetch();
      
      if (error.message !== "Bid cancelled by user") {
        toast({ 
          title: "❌ Bid Failed", 
          description: error.message, 
          variant: "destructive", 
          duration: 5000 
        });
      }
    } finally {
      setIsPlacingBid(false);
      setBiddingAuctionId(null);
    }
  };

  if (loading) return (
    <section className="py-16 bg-muted/30">
      <div className="container px-4 flex justify-center items-center min-h-[400px]">
        <div className="animate-spin h-16 w-16 border-b-2 border-primary rounded-full"></div>
      </div>
    </section>
  );

  if (error) return (
    <div className="text-center py-16">
      <p>{error}</p>
      <button onClick={() => refetch()}>Try Again</button>
    </div>
  );

  return (
    <section className="py-16 bg-muted/30">
      <div className="container px-4">
        <h2 className="text-4xl font-bold text-center mb-12 font-playfair">Current Auctions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {auctions.map(a => (
            <AuctionCard
              key={a.auctionId}
              id={a.auctionId}
              title={a.title}
              artist={a.artistName || "Unknown Artist"}
              currentBid={a.currentBid || a.startingBid || 0}
              timeRemaining={a.timeRemaining || ""}
              location={a.location || ""}
              bidders={a.bidders ?? 0}
              image={a.image || ""}
              status={a.status}
              endDate={a.endDate}
              startDate={a.startDate}
              currentUserId={currentUserId}
              highestBidder={a.highestBidder}
              onPlaceBid={handlePlaceBid}
              isBidding={biddingAuctionId === a.auctionId && isPlacingBid}
            />
          ))}
        </div>
      </div>
    </section>
  );
};