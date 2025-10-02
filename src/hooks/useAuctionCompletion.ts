// src/hooks/useAuctionCompletion.ts - CLEAN VERSION
import { useState, useEffect, useCallback, useRef } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';

interface AuctionCompletionProps {
  auctionId: string;
  endTime: string;
  currentBid: number;
  isHighestBidder: boolean;
  auctionTitle: string;
}

interface UseAuctionCompletionReturn {
  auctionStatus: 'live' | 'ended';
  timeUntilEnd: number;
  isAuctionActive: boolean;
}

export const useAuctionCompletion = ({
  auctionId,
  endTime,
  currentBid,
  isHighestBidder,
  auctionTitle
}: AuctionCompletionProps): UseAuctionCompletionReturn => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [auctionStatus, setAuctionStatus] = useState<'live' | 'ended'>('live');
  const [timeUntilEnd, setTimeUntilEnd] = useState(0);
  const hasNotifiedRef = useRef(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const handleAuctionWon = useCallback((wonAuctionId: string, winningBid: number, title: string) => {
    // Play success sound
    try {
      const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N+QQAoUXrTp66hVFApGn+DyvmETBiuJzfPSgis');
      audio.volume = 0.3;
      audio.play().catch(() => {});
    } catch {}

    // Store win data
    const wins = JSON.parse(localStorage.getItem('auction-wins') || '{}');
    wins[wonAuctionId] = { 
      winningBid, 
      title, 
      wonAt: new Date().toISOString(),
      paymentCompleted: false
    };
    localStorage.setItem('auction-wins', JSON.stringify(wins));

    // Browser notification
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(`Auction Won: ${title}`, {
        body: `You won with a bid of R${winningBid.toLocaleString()}`,
        icon: '/favicon.ico',
        tag: `auction-won-${wonAuctionId}`
      });
    }

    // Show toast notification with manual redirect
    setTimeout(() => {
      toast({ 
        title: "🎉 Congratulations! You Won!", 
        description: `You won "${title}" with a bid of R${winningBid.toLocaleString()}. Click here to proceed to payment.`,
        duration: 15000,
      });

      // Optional: Show a browser confirm for immediate payment
      setTimeout(() => {
        const shouldProceed = confirm(`Congratulations! You won "${title}" for R${winningBid.toLocaleString()}. Would you like to proceed to payment now?`);
        if (shouldProceed) {
          const paymentUrl = `/payment?auctionId=${wonAuctionId}&amount=${winningBid}&title=${encodeURIComponent(title)}`;
          navigate(paymentUrl);
        }
      }, 2000);
    }, 500);
  }, [navigate, toast]);

  const handleAuctionLost = useCallback((lostAuctionId: string, finalBid: number, title: string) => {
    toast({ 
      title: "⏰ Auction Ended", 
      description: `"${title}" has ended. Final bid: R${finalBid.toLocaleString()}`,
      duration: 6000
    });

    const losses = JSON.parse(localStorage.getItem('auction-losses') || '{}');
    losses[lostAuctionId] = { 
      title, 
      finalBid, 
      lostAt: new Date().toISOString() 
    };
    localStorage.setItem('auction-losses', JSON.stringify(losses));
  }, [toast]);

  const checkAuctionCompletion = useCallback(() => {
    if (!endTime) return;

    const now = new Date();
    const auctionEnd = new Date(endTime);
    const timeRemaining = auctionEnd.getTime() - now.getTime();

    setTimeUntilEnd(Math.max(0, timeRemaining));

    if (timeRemaining <= 0 && auctionStatus === 'live') {
      setAuctionStatus('ended');

      // Only notify once per auction
      const notificationKey = `auction-${auctionId}-notified`;
      if (!hasNotifiedRef.current && !localStorage.getItem(notificationKey)) {
        hasNotifiedRef.current = true;
        localStorage.setItem(notificationKey, 'true');

        setTimeout(() => {
          if (isHighestBidder) {
            handleAuctionWon(auctionId, currentBid, auctionTitle);
          } else {
            handleAuctionLost(auctionId, currentBid, auctionTitle);
          }
        }, 500);
      }
    }
  }, [
    endTime, 
    auctionStatus, 
    auctionId, 
    isHighestBidder, 
    currentBid, 
    auctionTitle,
    handleAuctionWon, 
    handleAuctionLost
  ]);

  // Request notification permission on first click
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

  // Set up completion checking
  useEffect(() => {
    if (!endTime || !auctionId) return;

    checkAuctionCompletion();

    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    intervalRef.current = setInterval(checkAuctionCompletion, 1000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [checkAuctionCompletion, endTime, auctionId]);

  // Reset notification state when auction changes
  useEffect(() => {
    hasNotifiedRef.current = false;
  }, [auctionId, isHighestBidder]);

  return {
    auctionStatus,
    timeUntilEnd,
    isAuctionActive: auctionStatus === 'live' && timeUntilEnd > 0
  };
};
