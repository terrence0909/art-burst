export interface Auction {
  id: string;
  title: string;
  artistName: string; // keep this
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
}

export type CreateAuctionData = Omit<Auction, 'id' | 'createdAt' | 'updatedAt'>;
