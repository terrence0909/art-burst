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

  // Handle bid updates - FIXED LOGIC
  const handleBidUpdate = useCallback((message: WebSocketMessage) => {
    if (message.message?.includes('Subscription') || message.message?.includes('Subscribed')) return;

    if (message.action === 'bidUpdate' && message.bid && message.auctionId) {
      const { bidAmount, bidderId, bidTime } = message.bid;
      const auctionId = message.auctionId;

      const messageId = `${auctionId}-${bidAmount}-${bidTime}`;
      if (processedBidsRef.current.has(messageId)) return;
      processedBidsRef.current.add(messageId);
      if (processedBidsRef.current.size > 100) processedBidsRef.current = new Set(Array.from(processedBidsRef.current).slice(-50));

      const currentAuction = auctions.find(a => a.auctionId === auctionId);
      if (!currentAuction) return;

      // FIXED: Store the old highest bidder before updating
      const previousHighestBidder = currentAuction.highestBidder;
      const wasMyBid = bidderId === currentUserId;
      const wasIPreviouslyHighest = previousHighestBidder === currentUserId;
      const isNewBidder = bidderId !== currentAuction.highestBidder;

      // Update auction state
      updateAuction(auctionId, {
        currentBid: bidAmount,
        bidders: isNewBidder ? (currentAuction.bidders || 0) + 1 : currentAuction.bidders,
        highestBidder: bidderId
      });

      const now = Date.now();
      if (now - lastToastTimeRef.current > 1000) {
        let toastTitle = "";
        let toastDescription = "";

        // FIXED: Better logic for determining toast messages
        if (wasMyBid) {
          // I placed this bid
          toastTitle = "🎉 Your Bid Placed!";
          toastDescription = `Successfully bid R${bidAmount.toLocaleString()} on "${currentAuction.title}"`;
        } else {
          // Someone else placed a bid - show general activity
          // Note: "You've Been Outbid" notifications should only show when auction ends
          toastTitle = "🔥 New Bid Alert!";
          toastDescription = `New bid of R${bidAmount.toLocaleString()} placed on "${currentAuction.title}"`;
        }

        toast({ 
          title: toastTitle, 
          description: toastDescription, 
          duration: wasMyBid ? 5000 : 4000 
        });
        lastToastTimeRef.current = now;
      }
    }
  }, [updateAuction, toast, currentUserId, auctions]);

  // Subscribe - REDUCED TOAST FREQUENCY
  useEffect(() => {
    if (!wsServiceRef.current) return;
    const subscribe = () => {
      if (wsServiceRef.current.isConnected() && !hasSubscribedRef.current) {
        const unsubscribe = wsServiceRef.current.subscribe('*', handleBidUpdate);
        hasSubscribedRef.current = true;
        (window as any).__auctionUnsubscribe = unsubscribe;
        
        // Only show this toast once per connection, not every 3 seconds
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
  }, [wsServiceRef.current, handleBidUpdate]);

  // Place bid
  const handlePlaceBid = async (auctionId: string) => {
    if (isPlacingBid) return toast({ title: "⏳ Please Wait", description: "Previous bid still processing...", duration: 2000 });
    if (!authToken) return toast({ title: "❌ Authentication Required", description: "Please wait for authentication to complete", variant: "destructive" });

    const auction = auctions.find(a => a.auctionId === auctionId);
    if (!auction) return toast({ title: "❌ Error", description: "Auction not found", variant: "destructive" });

    setBiddingAuctionId(auctionId);
    setIsPlacingBid(true);
    const originalState = { currentBid: auction.currentBid, bidders: auction.bidders, highestBidder: auction.highestBidder };

    try {
      const currentBid = auction.currentBid || auction.startingBid || 0;
      const minBid = currentBid + (auction.bidIncrement || 100);
      const bidAmountStr = prompt(`💰 Place your bid on "${auction.title}"\nCurrent bid: R${currentBid.toLocaleString()}\nMinimum bid: R${minBid.toLocaleString()}`);
      if (!bidAmountStr) throw new Error("Bid cancelled by user");

      const bidAmount = Number(bidAmountStr.replace(/[^0-9.]/g, ''));
      if (isNaN(bidAmount) || bidAmount < minBid) throw new Error(`Bid must be at least R${minBid.toLocaleString()}`);

      updateAuction(auctionId, {
        currentBid: bidAmount,
        bidders: auction.highestBidder === currentUserId ? auction.bidders : (auction.bidders || 0) + 1,
        highestBidder: currentUserId
      });

      if (wsServiceRef.current?.isConnected()) {
        await wsServiceRef.current.placeBid(auctionId, bidAmount, currentUserId);
        toast({ title: "🎉 Bid Placed Successfully!", description: `Your bid of R${bidAmount.toLocaleString()} is now active`, duration: 5000 });
      } else {
        const response = await fetch('https://x3ikd4thrj6qe3dwys2vbeo3ba0yondc.lambda-url.us-east-1.on.aws/', {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ auctionId, bidAmount, bidderId: currentUserId, authToken })
        });
        if (!response.ok) throw new Error(`Bid failed: ${response.status}`);
        toast({ title: "🎉 Bid Placed Successfully!", description: `Your bid of R${bidAmount.toLocaleString()} is now active`, duration: 5000 });
      }

    } catch (error: any) {
      console.error(error);
      updateAuction(auctionId, originalState);
      toast({ title: "❌ Bid Failed", description: error.message, variant: "destructive", duration: 5000 });
    } finally {
      setIsPlacingBid(false);
      setBiddingAuctionId(null);
    }
  };

  // Updated loading state - just the spinning circle, no text
  if (loading) return (
    <section className="py-16 bg-muted/30">
      <div className="container px-4 flex justify-center items-center min-h-[400px]">
        <div className="animate-spin h-16 w-16 border-b-2 border-primary rounded-full"></div>
      </div>
    </section>
  );

  if (error) return <div className="text-center py-16"><p>{error}</p><button onClick={() => refetch()}>Try Again</button></div>;

  // DEBUG: Log the first auction to see what fields are available
  if (auctions.length > 0) {
    console.log('📊 Sample auction data:', auctions[0]);
    console.log('📊 All auction fields:', Object.keys(auctions[0]));
  }

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