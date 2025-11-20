// src/hooks/useAuctions.ts - FIXED VERSION
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Auction } from '../types/auction';
import { fetchAuctions } from '../api/auctions';

export const useAuctions = () => {
  const [allAuctions, setAllAuctions] = useState<Auction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const hasInitializedRef = useRef(false);

  // ✅ FIXED: Moved normalizeAuction outside to prevent recreation
  const normalizeAuction = (auction: any): Auction => ({
    ...auction,
    id: auction.auctionId || auction.id || auction._id || "",
    auctionId: auction.auctionId || auction.id || auction._id || "",
    title: auction.title || "Untitled",
    artistName: auction.artistName || auction.artist || "Unknown Artist",
    currentBid: auction.currentBid ?? auction.startingBid ?? 0,
    startingBid: auction.startingBid ?? auction.currentBid ?? 0,
    timeRemaining: auction.timeRemaining ?? "",
    image: auction.image ?? "",
    status: auction.status || "upcoming",
    location: auction.location ?? "",
    distance: auction.distance ?? "",
    bidders: auction.bidders ?? auction.bidCount ?? 0,
    medium: auction.medium ?? "",
    year: auction.year ?? "",
    bidIncrement: auction.bidIncrement ?? 100,
    endDate: auction.endDate,
    startDate: auction.startDate,
    endTime: auction.endTime,
    startTime: auction.startTime,
    creatorId: auction.creatorId || auction.userId || auction.ownerId || auction.createdBy,
  });

  // ✅ FIXED: Memoize the filter function to prevent constant recreations
  const publishedAuctions = useMemo(() => {
    return allAuctions.filter(auction => {
      const validStatuses = ['active', 'upcoming', 'live', 'ended', 'closed'];
      return validStatuses.includes(auction.status?.toLowerCase() || '');
    });
  }, [allAuctions]);

  // ✅ FIXED: Removed loadAuctions from dependency array - only call on mount
  useEffect(() => {
    // Only load once on component mount
    if (hasInitializedRef.current) return;
    hasInitializedRef.current = true;

    const loadAuctions = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await fetchAuctions();
        
        const sortedAuctions = data
          .map(normalizeAuction)
          .sort((a, b) => {
            const dateA = new Date(a.createdAt || a.startDate || 0);
            const dateB = new Date(b.createdAt || b.startDate || 0);
            return dateB.getTime() - dateA.getTime();
          });
        
        setAllAuctions(sortedAuctions);
        
        console.log('📊 Auctions loaded:', {
          total: sortedAuctions.length,
          published: sortedAuctions.filter(a => ['active', 'upcoming', 'live', 'ended', 'closed'].includes(a.status?.toLowerCase() || '')).length,
          drafts: sortedAuctions.filter(a => a.status === 'draft').length
        });
        
      } catch (err) {
        console.error('Error loading auctions:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch auctions');
      } finally {
        setLoading(false);
      }
    };

    loadAuctions();
  }, []); // ✅ FIXED: Empty dependency array - only run once on mount

  // ✅ FIXED: refetch doesn't include normalizeAuction in dependencies
  const refetch = useCallback(async () => {
    try {
      setError(null);
      const data = await fetchAuctions();
      
      const sortedAuctions = data
        .map(normalizeAuction)
        .sort((a, b) => {
          const dateA = new Date(a.createdAt || a.startDate || 0);
          const dateB = new Date(b.createdAt || b.startDate || 0);
          return dateB.getTime() - dateA.getTime();
        });
      
      setAllAuctions(sortedAuctions);
      console.log('🔄 Auctions refetched:', sortedAuctions.length);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to refetch auctions');
    }
  }, []); // ✅ FIXED: Empty dependency array

  // ✅ FIXED: updateAuction is optimized and doesn't cause unnecessary re-renders
  const updateAuction = useCallback((auctionId: string, updates: Partial<Auction>) => {
    setAllAuctions(prev => {
      const updated = prev.map(auction => 
        auction.auctionId === auctionId ? { ...auction, ...updates } : auction
      );
      
      // ✅ Only update state if something actually changed
      if (JSON.stringify(updated) !== JSON.stringify(prev)) {
        return updated;
      }
      return prev;
    });
  }, []);

  return {
    auctions: publishedAuctions,
    loading,
    error,
    refetch,
    updateAuction,
  };
};