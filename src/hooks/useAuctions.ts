// src/hooks/useAuctions.ts - FIXED VERSION
import { useState, useEffect, useCallback } from 'react';
import { Auction } from '../types/auction';
import { fetchAuctions } from '../api/auctions';

export const useAuctions = () => {
  const [auctions, setAuctions] = useState<Auction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // FIXED: Don't strip out fields - the transformAuction function already normalizes everything
  const normalizeAuction = useCallback((auction: any): Auction => ({
    ...auction, // Keep all existing fields from transformAuction
    id: auction.auctionId || auction.id || auction._id || "",
    auctionId: auction.auctionId || auction.id || auction._id || "",
    title: auction.title || "Untitled",
    artistName: auction.artistName || auction.artist || "Unknown Artist",
    currentBid: auction.currentBid ?? auction.startingBid ?? 0,
    startingBid: auction.startingBid ?? auction.currentBid ?? 0,
    timeRemaining: auction.timeRemaining ?? "",
    image: auction.image ?? "",
    status: auction.status || "upcoming", // FIXED: Don't override API status
    location: auction.location ?? "",
    distance: auction.distance ?? "",
    bidders: auction.bidders ?? auction.bidCount ?? 0,
    medium: auction.medium ?? "",
    year: auction.year ?? "",
    bidIncrement: auction.bidIncrement ?? 100,
    // These are already set by transformAuction, but we preserve them
    endDate: auction.endDate,
    startDate: auction.startDate,
    endTime: auction.endTime,
    startTime: auction.startTime,
  }), []);

  const loadAuctions = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchAuctions();
      
      // ADDED: Debug logging to see what's coming from API
      console.log('🔍 API Response - Raw data:', data);
      console.log('🔍 Looking for auction 840199022:', 
        data.find(a => (a.auctionId || a.id) === '840199022')
      );
      
      // FIX: Sort auctions by createdAt date (newest first)
      const sortedAuctions = data
        .map(normalizeAuction)
        .sort((a, b) => {
          const dateA = new Date(a.createdAt || a.startDate || 0);
          const dateB = new Date(b.createdAt || b.startDate || 0);
          return dateB.getTime() - dateA.getTime(); // Newest first
        });
      
      // ADDED: Debug logging to see after normalization
      console.log('🔍 After normalization - auction 840199022:', 
        sortedAuctions.find(a => a.auctionId === '840199022')
      );
      
      setAuctions(sortedAuctions);
    } catch (err) {
      console.error('Error in useAuctions hook:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch auctions');
    } finally {
      setLoading(false);
    }
  }, [normalizeAuction]);

  useEffect(() => {
    loadAuctions();
  }, [loadAuctions]);

  const refetch = useCallback(async () => {
    try {
      setError(null);
      const data = await fetchAuctions();
      
      // FIX: Apply same sorting to refetch
      const sortedAuctions = data
        .map(normalizeAuction)
        .sort((a, b) => {
          const dateA = new Date(a.createdAt || a.startDate || 0);
          const dateB = new Date(b.createdAt || b.startDate || 0);
          return dateB.getTime() - dateA.getTime(); // Newest first
        });
      
      setAuctions(sortedAuctions);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to refetch auctions');
    }
  }, [normalizeAuction]);

  // Add this function to update a single auction
  const updateAuction = useCallback((auctionId: string, updates: Partial<Auction>) => {
    setAuctions(prev => prev.map(auction => 
      auction.auctionId === auctionId ? { ...auction, ...updates } : auction
    ));
  }, []);

  return {
    auctions,
    loading,
    error,
    refetch,
    setAuctions,
    updateAuction,
  };
};