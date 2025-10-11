// src/hooks/useAuctionCompletion.ts - SIMPLE FIX
import { useState, useEffect, useCallback, useRef } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';

interface AuctionCompletionProps {
  auctionId: string;
  endDate: string;
  currentBid: number;
  isHighestBidder: boolean;
  auctionTitle: string;
  startDate?: string;
  status?: 'live' | 'upcoming' | 'ended' | 'closed';
}

interface UseAuctionCompletionReturn {
  auctionStatus: 'live' | 'ended' | 'upcoming' | 'closed';
  timeUntilEnd: number;
  isAuctionActive: boolean;
  timeUntilStart: number;
}

export const useAuctionCompletion = ({
  auctionId,
  endDate,
  currentBid,
  isHighestBidder,
  auctionTitle,
  startDate,
  status = 'live'
}: AuctionCompletionProps): UseAuctionCompletionReturn => {
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [auctionStatus, setAuctionStatus] = useState<'live' | 'ended' | 'upcoming' | 'closed'>(status);
  const [timeUntilEnd, setTimeUntilEnd] = useState(0);
  const [timeUntilStart, setTimeUntilStart] = useState(0);
  const hasNotifiedRef = useRef(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const checkAuctionCompletion = useCallback(() => {
    const now = new Date();
    
    // Simple date parsing - no modifications
    const auctionStart = startDate ? new Date(startDate) : null;
    const auctionEnd = new Date(endDate);

    if (isNaN(auctionEnd.getTime())) {
      return;
    }

    const endTimeMs = auctionEnd.getTime();
    const startTimeMs = auctionStart ? auctionStart.getTime() : null;
    
    const timeUntilEnd = Math.max(0, endTimeMs - now.getTime());
    const timeUntilStart = startTimeMs ? Math.max(0, startTimeMs - now.getTime()) : 0;

    setTimeUntilEnd(timeUntilEnd);
    setTimeUntilStart(timeUntilStart);

    let newStatus: 'live' | 'ended' | 'upcoming' | 'closed';
    
    if (status === 'closed') {
      newStatus = 'closed';
    } else if (timeUntilEnd <= 0) {
      newStatus = 'ended';
    } else if (startTimeMs && timeUntilStart > 0) {
      newStatus = 'upcoming';
    } else {
      newStatus = 'live';
    }

    setAuctionStatus(newStatus);

    // Handle notifications for ended auctions
    if (newStatus === 'ended') {
      const notificationKey = `auction-${auctionId}-notified`;
      if (!hasNotifiedRef.current && !localStorage.getItem(notificationKey)) {
        hasNotifiedRef.current = true;
        localStorage.setItem(notificationKey, 'true');

        setTimeout(() => {
          if (isHighestBidder) {
            try {
              const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N+QQAoUXrTp66hVFApGn+/DywmETBiuJzfPSgis');
              audio.volume = 0.3;
              audio.play().catch(() => {});
            } catch {}

            const wins = JSON.parse(localStorage.getItem('auction-wins') || '{}');
            wins[auctionId] = { 
              winningBid: currentBid, 
              title: auctionTitle, 
              wonAt: new Date().toISOString(),
              paymentCompleted: false
            };
            localStorage.setItem('auction-wins', JSON.stringify(wins));

            setTimeout(() => {
              toast({ 
                title: "🎉 Congratulations! You Won!", 
                description: `You won "${auctionTitle}" with a bid of R${currentBid.toLocaleString()}. Click here to proceed to payment.`,
                duration: 15000,
              });
            }, 500);
          } else {
            toast({ 
              title: "⏰ Auction Ended", 
              description: `"${auctionTitle}" has ended. Final bid: R${currentBid.toLocaleString()}`,
              duration: 6000
            });
          }
        }, 500);
      }
    }
  }, [endDate, startDate, auctionId, isHighestBidder, currentBid, auctionTitle, toast, status]);

  useEffect(() => {
    const handleFirstClick = () => {
      if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission().catch(() => {});
      }
      document.removeEventListener('click', handleFirstClick);
    };

    document.addEventListener('click', handleFirstClick);
    return () => document.removeEventListener('click', handleFirstClick);
  }, []);

  useEffect(() => {
    if (!endDate) return;

    checkAuctionCompletion();

    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    intervalRef.current = setInterval(checkAuctionCompletion, 1000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [checkAuctionCompletion, endDate, startDate, auctionId]);

  useEffect(() => {
    hasNotifiedRef.current = false;
  }, [auctionId, isHighestBidder]);

  return {
    auctionStatus,
    timeUntilEnd,
    timeUntilStart,
    isAuctionActive: auctionStatus === 'live' && timeUntilEnd > 0
  };
};