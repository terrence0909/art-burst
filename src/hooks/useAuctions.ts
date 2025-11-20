// src/hooks/useAuctions.ts - WITH DRAFT FILTER
import { useState, useEffect, useCallback, useMemo } from 'react'; // ADD useMemo HERE
import { Auction } from '../types/auction';
import { fetchAuctions } from '../api/auctions';

export const useAuctions = () => {
  const [allAuctions, setAllAuctions] = useState<Auction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const normalizeAuction = useCallback((auction: any): Auction => ({
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
  }), []);

  // 🔥 ADD THIS: Filter out draft auctions
  const publishedAuctions = useMemo(() => {
    return allAuctions.filter(auction => {
      // Only show active, upcoming, live, or ended auctions
      const validStatuses = ['active', 'upcoming', 'live', 'ended', 'closed'];
      return validStatuses.includes(auction.status?.toLowerCase() || '');
    });
  }, [allAuctions]);

  const loadAuctions = useCallback(async () => {
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
        published: publishedAuctions.length,
        drafts: sortedAuctions.filter(a => a.status === 'draft').length
      });
      
    } catch (err) {
      console.error('Error in useAuctions hook:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch auctions');
    } finally {
      setLoading(false);
    }
  }, [normalizeAuction, publishedAuctions]);

  useEffect(() => {
    loadAuctions();
  }, [loadAuctions]);

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
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to refetch auctions');
    }
  }, [normalizeAuction]);

  const updateAuction = useCallback((auctionId: string, updates: Partial<Auction>) => {
    setAllAuctions(prev => prev.map(auction => 
      auction.auctionId === auctionId ? { ...auction, ...updates } : auction
    ));
  }, []);

  return {
    // 🔥 Return filtered auctions (no drafts) for the main grid
    auctions: publishedAuctions,
    loading,
    error,
    refetch,
    updateAuction,
  };
};