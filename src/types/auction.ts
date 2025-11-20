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
  status: "live" | "upcoming" | "ended" | "closed" | "draft" ;
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
  highestBidder?: string;
  bids?: Bid[];
  // Date/time fields - added missing ones
  endTime?: string;
  endDate?: string;
  startTime?: string;
  startDate?: string;
  creatorId?: string;
}

export type CreateAuctionData = Omit<Auction, 'id' | 'createdAt' | 'updatedAt'>;