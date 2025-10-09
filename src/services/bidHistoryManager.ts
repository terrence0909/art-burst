export interface BidRecord {
  bidId: string;
  auctionId: string;
  bidAmount: number;
  bidderId: string;
  bidderName?: string;
  bidTime: string;
  timestamp: number;
}

class BidHistoryManager {
  private bidHistory: Map<string, BidRecord[]> = new Map();
  private maxBidsPerAuction = 20;
  private storageKey = 'art-burst-bid-history';

  constructor() {
    this.loadFromStorage();
  }

  private loadFromStorage() {
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        this.bidHistory = new Map(Object.entries(parsed));
        console.log('📋 Loaded bid history from storage:', this.bidHistory.size, 'auctions');
      }
    } catch (error) {
      console.error('❌ Failed to load bid history from storage:', error);
    }
  }

  private saveToStorage() {
    try {
      const serializable = Object.fromEntries(this.bidHistory);
      localStorage.setItem(this.storageKey, JSON.stringify(serializable));
    } catch (error) {
      console.error('❌ Failed to save bid history to storage:', error);
    }
  }

  addBid(auctionId: string, bid: BidRecord) {
    const auctionBids = this.bidHistory.get(auctionId) || [];
    
    const exists = auctionBids.some(b => 
      b.bidId === bid.bidId || 
      (b.bidAmount === bid.bidAmount && b.bidderId === bid.bidderId && b.bidTime === bid.bidTime)
    );
    
    if (exists) {
      console.log('📋 Bid already in history, skipping');
      return;
    }

    auctionBids.unshift(bid);
    
    if (auctionBids.length > this.maxBidsPerAuction) {
      auctionBids.splice(this.maxBidsPerAuction);
    }
    
    this.bidHistory.set(auctionId, auctionBids);
    this.saveToStorage();
    
    console.log(`📋 Added bid to history. Total bids for ${auctionId}:`, auctionBids.length);
  }

  getBidHistory(auctionId: string, limit: number = 10): BidRecord[] {
    const bids = this.bidHistory.get(auctionId) || [];
    return bids.slice(0, limit);
  }

  hasBids(auctionId: string): boolean {
    const bids = this.bidHistory.get(auctionId);
    return !!bids && bids.length > 0;
  }

  getBidCount(auctionId: string): number {
    return this.bidHistory.get(auctionId)?.length || 0;
  }

  clearHistory() {
    this.bidHistory.clear();
    localStorage.removeItem(this.storageKey);
    console.log('🗑️ Bid history cleared');
  }
}

export const bidHistoryManager = new BidHistoryManager();