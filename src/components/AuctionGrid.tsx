import { AuctionCard } from "./AuctionCard";
import artwork1 from "@/assets/artwork-1.jpeg";
import artwork2 from "@/assets/artwork-2.jpeg";
import artwork3 from "@/assets/artwork-3.jpeg";

// Mock data for auctions
const mockAuctions = [
  {
    id: "1",
    title: "Abstract Harmony",
    artist: "Thabo Maaku",
    currentBid: 2400,
    timeRemaining: "2h 34m",
    location: "Downtown",
    bidders: 12,
    image: artwork1,
    status: "live" as const
  },
  {
    id: "2", 
    title: "Marble Dreams",
    artist: "Marcus Chen",
    currentBid: 3800,
    timeRemaining: "1d 5h",
    location: "Mission Bay",
    bidders: 8,
    image: artwork2,
    status: "upcoming" as const
  },
  {
    id: "3",
    title: "Sunset Valley",
    artist: "Sarah Thompson",
    currentBid: 1950,
    timeRemaining: "Ended",
    location: "Nob Hill",
    bidders: 15,
    image: artwork3,
    status: "ended" as const
  },
  {
    id: "4",
    title: "Urban Pulse",
    artist: "David Kim",
    currentBid: 1200,
    timeRemaining: "4h 12m",
    location: "SOMA",
    bidders: 6,
    image: artwork1,
    status: "live" as const
  },
  {
    id: "5",
    title: "Coastal Whispers",
    artist: "Maria Santos",
    currentBid: 2800,
    timeRemaining: "12h 45m",
    location: "Marina",
    bidders: 9,
    image: artwork2,
    status: "live" as const
  },
  {
    id: "6",
    title: "Golden Hour",
    artist: "Alex Turner",
    currentBid: 3200,
    timeRemaining: "2d 8h",
    location: "Castro",
    bidders: 14,
    image: artwork3,
    status: "upcoming" as const
  }
];

export const AuctionGrid = () => {
  return (
    <section className="py-16 bg-muted/30">
      <div className="container px-4">
        <div className="text-center mb-12">
          <h2 className="font-playfair text-4xl font-bold mb-4">
            Current Auctions Near You
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Discover unique artwork from talented local artists. Place your bids 
            and become part of your city's vibrant art community.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {mockAuctions.map((auction) => (
            <AuctionCard key={auction.id} {...auction} />
          ))}
        </div>

        <div className="text-center mt-12">
          <button className="btn-primary">
            View All Auctions
          </button>
        </div>
      </div>
    </section>
  );
};