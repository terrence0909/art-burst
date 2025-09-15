import { useState, useEffect, useCallback } from 'react';
import { realtimeService, BidUpdate, AuctionData } from '../services/realtime';

export const useLiveBids = (auctionId: string) => {
  const [currentBid, setCurrentBid] = useState<number>(0);
  const [highestBidder, setHighestBidder] = useState<string>('');
  const [bidCount, setBidCount] = useState<number>(0);
  const [latestBids, setLatestBids] = useState<any[]>([]);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const handleNewBid = useCallback((update: BidUpdate) => {
    if (update.auction) {
      setCurrentBid(update.auction.currentBid);
      setHighestBidder(update.auction.highestBidder);
      setBidCount(update.auction.bidCount);
    }
    
    if (update.bid) {
      setLatestBids(prev => [update.bid, ...prev.slice(0, 9)]);
    }
  }, []);

  const loadInitialData = useCallback(async () => {
    if (!auctionId) return;

    try {
      setLoading(true);
      setError(null);
      
      const data: AuctionData = await realtimeService.getAuctionData(auctionId);
      
      // Set initial state from API
      setCurrentBid(data.auction.currentBid || data.auction.startingBid);
      setHighestBidder(data.auction.highestBidder || '');
      setBidCount(data.auction.bidCount || 0);
      setLatestBids(data.bidHistory || []);
      setIsConnected(true);
      
    } catch (err: any) {
      console.error('Error loading initial auction data:', err);
      setError(err.message || 'Failed to load auction data');
      setIsConnected(false);
    } finally {
      setLoading(false);
    }
  }, [auctionId]);

  useEffect(() => {
    if (!auctionId) return;

    // Load initial data
    loadInitialData();

    // Subscribe to real-time updates
    const unsubscribe = realtimeService.subscribe(auctionId, handleNewBid);

    return () => {
      unsubscribe();
    };
  }, [auctionId, handleNewBid, loadInitialData]);

  // Method to manually refresh data
  const refresh = useCallback(() => {
    loadInitialData();
  }, [loadInitialData]);

  // Method to place a bid
  const placeBid = useCallback(async (bidAmount: number, bidderId: string) => {
    try {
      const result = await realtimeService.placeBid(auctionId, bidAmount, bidderId);
      
      // Optimistically update the UI
      setCurrentBid(bidAmount);
      setHighestBidder(bidderId);
      setBidCount(prev => prev + 1);
      
      return result;
    } catch (error: any) {
      console.error('Error placing bid:', error);
      throw error;
    }
  }, [auctionId]);

  return {
    currentBid,
    highestBidder,
    bidCount,
    latestBids,
    isConnected,
    loading,
    error,
    setCurrentBid,
    setHighestBidder,
    setBidCount,
    refresh,
    placeBid
  };
};