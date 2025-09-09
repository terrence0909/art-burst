export interface Auction {
  id: string;
  title: string;
  artistName: string;
  artist: string;
  currentBid: number;
  timeRemaining: string;
  location: string;
  bidders: number;
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