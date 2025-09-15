// src/services/realtime.ts
export interface BidUpdate {
  type: 'NEW_BID' | 'AUCTION_UPDATE';
  auctionId: string;
  bid?: {
    bidId: string;
    bidAmount: number;
    userId: string;
    bidTime: string;
  };
  auction?: {
    auctionId: string;
    currentBid: number;
    highestBidder: string;
    bidCount: number;
  };
  timestamp: string;
}

export interface AuctionData {
  auction: {
    auctionId: string;
    title: string;
    currentBid: number;
    highestBidder: string;
    bidCount: number;
    startingBid: number;
  };
  latestBid?: {
    bidId: string;
    bidAmount: number;
    userId: string;
    bidTime: string;
  };
  bidHistory: Array<{
    bidId: string;
    bidAmount: number;
    userId: string;
    bidTime: string;
  }>;
  statistics: {
    totalBids: number;
    currentHighestBid: number;
    uniqueBidders: number;
    lastBidTime?: string;
  };
}

export class RealtimeAuctionService {
  private baseUrl: string;
  private pollingInterval: number;
  private subscribers: Map<string, Set<(update: BidUpdate) => void>> = new Map();
  private intervalIds: Map<string, NodeJS.Timeout> = new Map();
  private lastBidCounts: Map<string, number> = new Map();

  constructor(baseUrl: string, pollingInterval = 2000) {
    this.baseUrl = baseUrl;
    this.pollingInterval = pollingInterval;
  }

  // Subscribe to auction updates
  subscribe(auctionId: string, callback: (update: BidUpdate) => void): () => void {
    if (!this.subscribers.has(auctionId)) {
      this.subscribers.set(auctionId, new Set());
      this.startPolling(auctionId);
    }

    this.subscribers.get(auctionId)!.add(callback);

    // Return unsubscribe function
    return () => {
      const auctionSubscribers = this.subscribers.get(auctionId);
      if (auctionSubscribers) {
        auctionSubscribers.delete(callback);
        if (auctionSubscribers.size === 0) {
          this.stopPolling(auctionId);
          this.subscribers.delete(auctionId);
        }
      }
    };
  }

  // Get initial auction data
  async getAuctionData(auctionId: string): Promise<AuctionData> {
    try {
      const response = await fetch(`${this.baseUrl}/auction/${auctionId}`);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Error fetching auction data:', error);
      throw error;
    }
  }

  // Place a bid
  async placeBid(auctionId: string, bidAmount: number, bidderId: string): Promise<any> {
    try {
      const response = await fetch(`${this.baseUrl}/bid`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          auctionId,
          bidAmount,
          bidderId,
        }),
      });

      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.message || 'Failed to place bid');
      }

      return result;
    } catch (error) {
      console.error('Error placing bid:', error);
      throw error;
    }
  }

  private startPolling(auctionId: string) {
    const intervalId = setInterval(async () => {
      try {
        const data = await this.getAuctionData(auctionId);
        const lastBidCount = this.lastBidCounts.get(auctionId) || 0;
        
        // Check if there's been a new bid (bidCount changed)
        if (data.auction.bidCount > lastBidCount) {
          this.lastBidCounts.set(auctionId, data.auction.bidCount);
          
          const update: BidUpdate = {
            type: 'AUCTION_UPDATE',
            auctionId,
            auction: {
              auctionId: data.auction.auctionId,
              currentBid: data.auction.currentBid,
              highestBidder: data.auction.highestBidder,
              bidCount: data.auction.bidCount,
            },
            bid: data.latestBid,
            timestamp: new Date().toISOString(),
          };

          this.notifySubscribers(auctionId, update);
        }
      } catch (error) {
        console.error(`Polling error for auction ${auctionId}:`, error);
      }
    }, this.pollingInterval);

    this.intervalIds.set(auctionId, intervalId);
  }

  private stopPolling(auctionId: string) {
    const intervalId = this.intervalIds.get(auctionId);
    if (intervalId) {
      clearInterval(intervalId);
      this.intervalIds.delete(auctionId);
      this.lastBidCounts.delete(auctionId);
    }
  }

  private notifySubscribers(auctionId: string, update: BidUpdate) {
    const subscribers = this.subscribers.get(auctionId);
    if (subscribers) {
      subscribers.forEach(callback => callback(update));
    }
  }

  // Cleanup when component unmounts
  destroy() {
    this.intervalIds.forEach(intervalId => clearInterval(intervalId));
    this.intervalIds.clear();
    this.subscribers.clear();
    this.lastBidCounts.clear();
  }
}

// Export singleton instance
export const realtimeService = new RealtimeAuctionService(
  import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/dev'
);