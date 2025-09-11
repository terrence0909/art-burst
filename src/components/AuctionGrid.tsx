import { AuctionCard } from "./AuctionCard";
import { useAuctions } from "../hooks/useAuctions";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast"; // Adjust path if needed

export const AuctionGrid = () => {
  const { toast } = useToast();
  const { auctions: initialAuctions, loading, error, refetch } = useAuctions();
  const [auctions, setAuctions] = useState(initialAuctions);
  const [isPlacingBid, setIsPlacingBid] = useState(false);

  // Update local auctions when data refetches
  useEffect(() => {
    setAuctions(initialAuctions);
  }, [initialAuctions]);

  // Function to handle bid placement
  const handlePlaceBid = async (auctionId: string) => {
    const bidAmountStr = prompt("Enter your bid amount:");
    if (!bidAmountStr) return;

    const bidAmount = Number(bidAmountStr);
    if (isNaN(bidAmount) || bidAmount <= 0) {
      toast({
        title: "Invalid Bid Amount",
        description: "Please enter a valid bid amount",
        variant: "destructive",
      });
      return;
    }

    setIsPlacingBid(true);

    try {
      // Get token from localStorage (your working approach)
      const tokenKeys = Object.keys(localStorage).filter(
        (key) => key.includes("Cognito") && key.includes("idToken")
      );

      if (tokenKeys.length === 0) {
        toast({
          title: "Login Required",
          description: "Please log in to place a bid",
          variant: "destructive",
        });
        setIsPlacingBid(false);
        return;
      }

      const token = localStorage.getItem(tokenKeys[0])!;

      // Get user ID from localStorage
      const userKeys = Object.keys(localStorage).filter(
        (key) => key.includes("Cognito") && key.includes("LastAuthUser")
      );
      const userId = userKeys.length > 0 ? localStorage.getItem(userKeys[0])! : "unknown-user";

      // Find the auction to get current bid info
      const auction = auctions.find((a) => a.id === auctionId);
      const currentBid = auction?.currentBid || auction?.startingBid || 0;

      if (bidAmount <= currentBid) {
        toast({
          title: "Bid Too Low",
          description: `Bid must be higher than current bid of R${currentBid}`,
          variant: "destructive",
        });
        setIsPlacingBid(false);
        return;
      }

      console.log("Placing bid with:", { auctionId, bidAmount, userId });

      const response = await fetch(
        "https://v3w12ytklh.execute-api.us-east-1.amazonaws.com/prod/auctions/bid",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            auctionId,
            bidAmount,
            bidderId: userId,
          }),
        }
      );

      const data = await response.json();

      if (response.ok) {
        // ✅ IMMEDIATE UI UPDATE
        const updatedAuctions = auctions.map(a => 
          a.id === auctionId 
            ? { 
                ...a, 
                currentBid: bidAmount,
                bidCount: (a.bidCount ?? 0) + 1, // Fixed: using nullish coalescing
              }
            : a
        );
        setAuctions(updatedAuctions);

        toast({
          title: "Bid Placed Successfully!",
          description: `Your bid of R${bidAmount} has been placed`,
        });
        
        refetch(); // Refresh the auctions list in background
      } else {
        toast({
          title: "Bid Failed",
          description: data.message || "Unknown error occurred",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Bid error:", error);
      if (error instanceof Error) {
        toast({
          title: "Error",
          description: `Bid failed: ${error.message}`,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error",
          description: "Error placing bid. Please try again.",
          variant: "destructive",
        });
      }
    } finally {
      setIsPlacingBid(false);
    }
  };

  if (loading) {
    return (
      <section className="py-16 bg-muted/30">
        <div className="container px-4 text-center">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-300 rounded w-1/4 mx-auto mb-4"></div>
            <div className="h-4 bg-gray-300 rounded w-1/2 mx-auto mb-12"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-80 bg-gray-300 rounded-lg"></div>
              ))}
            </div>
          </div>
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="py-16 bg-muted/30">
        <div className="container px-4 text-center">
          <p className="text-red-500 mb-4">Error loading auctions: {error}</p>
          <button
            onClick={refetch}
            className="bg-blue-500 text-white px-6 py-2 rounded hover:bg-blue-600 transition-colors"
          >
            Try Again
          </button>
        </div>
      </section>
    );
  }

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

        {auctions.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground text-lg mb-4">
              No auctions available at the moment.
            </p>
            <button
              onClick={refetch}
              className="bg-blue-500 text-white px-6 py-2 rounded hover:bg-blue-600 transition-colors"
            >
              Check Again
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {auctions.map((auction) => (
              <AuctionCard
                key={auction.auctionId}
                id={auction.auctionId}
                title={auction.title}
                artist={auction.artistName || "Unknown Artist"} 
                currentBid={auction.currentBid || auction.startingBid || 0}
                timeRemaining={auction.timeRemaining || ""}
                location={auction.location || ""}
                bidders={auction.bidCount ?? 0} // Fixed: using nullish coalescing
                image={auction.image || ""}
                status={auction.status}
                onPlaceBid={handlePlaceBid}
              />
            ))}
          </div>
        )}

        {isPlacingBid && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-lg flex items-center gap-3">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500"></div>
              <p>Placing your bid...</p>
            </div>
          </div>
        )}
      </div>
    </section>
  );
};