import { useState, useEffect } from 'react';
import { Auction } from '../types/auction';
import { fetchAuctions } from '../api/auctions';

export const useAuctions = () => {
  const [auctions, setAuctions] = useState<Auction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadAuctions = async () => {
      try {
        setLoading(true);
        setError(null);
        
        console.log('Fetching auctions from API...');
        const data = await fetchAuctions();
        console.log('Auctions fetched successfully:', data);
        
        setAuctions(data);
      } catch (err) {
        console.error('Error in useAuctions hook:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch auctions');
      } finally {
        setLoading(false);
      }
    };

    loadAuctions();
  }, []);

  const refetch = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchAuctions();
      setAuctions(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to refetch auctions');
    } finally {
      setLoading(false);
    }
  };

  return {
    auctions,
    loading,
    error,
    refetch,
  };
};