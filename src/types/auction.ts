// src/types/auction.ts
export interface Bid {
  bidId: string;
  bidAmount: number;
  bidderId: string;
  bidTime: string;
  userId: string;
  auctionId: string;
}

export interface Auction {
  id: string;
  auctionId: string;
  title: string;
  artistName: string;
  currentBid: number;
  timeRemaining: string;
  location: string;
  bidders: number;
  bidCount?: number;
  image: string;
  status: 'live' | 'upcoming' | 'ended';
  description?: string;
  bidIncrement?: number;
  distance?: string;
  totalBids?: number;
  watchers?: number;
  medium?: string;
  dimensions?: string;
  year?: string;
  condition?: string;
  startingBid?: number;
  createdAt?: string;
  updatedAt?: string;
  // You might also want to add bids array to the Auction interface
  bids?: Bid[];
}

export type CreateAuctionData = Omit<Auction, 'id' | 'createdAt' | 'updatedAt'>;