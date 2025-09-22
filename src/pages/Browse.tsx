import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Search, Filter, MapPin, Grid, List } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { AuctionCard } from "@/components/AuctionCard";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/components/ui/use-toast";
import { getCurrentUser, fetchAuthSession } from "aws-amplify/auth";
import artwork1 from "@/assets/artwork-1.jpeg";
import artwork2 from "@/assets/artwork-2.jpeg";
import artwork3 from "@/assets/artwork-3.jpeg";

// Update this to your API Gateway endpoint
const API_BASE = "/api";

interface Auction {
  id: string;
  title: string;
  artist: string;
  currentBid: number;
  timeRemaining: string;
  image: string;
  status: "live" | "upcoming" | "ended";
  location: string;
  distance: string;
  medium?: string;
  year?: string;
  bidders?: number;
}

const Browse = () => {
  const [searchParams] = useSearchParams();
  const urlQuery = searchParams.get('query') || '';
  const urlLocation = searchParams.get('location') || '';
  
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [searchQuery, setSearchQuery] = useState(urlQuery);
  const [auctions, setAuctions] = useState<Auction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Sync with URL parameters when component loads
  useEffect(() => {
    if (urlQuery) {
      setSearchQuery(urlQuery);
    }
  }, [urlQuery]);

  useEffect(() => {
    fetchAuctions();
  }, []);

  const fetchAuctions = async () => {
    try {
      setLoading(true);
      console.log('Fetching auctions from:', `${API_BASE}/auctions`);
      
      const response = await fetch(`${API_BASE}/auctions`);
      console.log('Response status:', response.status);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch auctions: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('Raw API response:', data);
      
      // Handle both Lambda proxy format and direct array response
      const auctionData = data.body ? JSON.parse(data.body) : data;
      console.log('Processed auction data:', auctionData);
      
      if (auctionData.length > 0) {
        console.log('First auction object:', auctionData[0]);
        console.log('All field names in first auction:', Object.keys(auctionData[0] || {}));
        console.log('First auction image URL:', auctionData[0]?.image || auctionData[0]?.images?.[0]);
      }
      
      // Transform API data to match frontend structure
      const transformedAuctions: Auction[] = auctionData.map((auction: any) => {
        const transformed = {
          id: auction.auctionId || auction.id,
          title: auction.title || `Auction ${auction.auctionId}`,
          artist: auction.artistName || auction.artist || "Unknown Artist",
          currentBid: auction.currentBid || auction.startingBid || 0,
          timeRemaining: calculateTimeRemaining(auction.endDate || auction.endTime),
          image: auction.image || (auction.images && auction.images[0]) || getRandomArtwork(),
          status: getAuctionStatus(auction.startDate || auction.startTime, auction.endDate || auction.endTime),
          location: auction.location || "Bloemfontein, SA",
          distance: calculateDistance(auction.location),
          medium: auction.medium,
          year: auction.year,
          // Add the bidders prop that AuctionCard expects
          bidders: auction.bidCount || 0,
        };

        console.log('Transformed auction:', transformed);
        return transformed;
      });
      
      console.log('All transformed auctions:', transformedAuctions);
      setAuctions(transformedAuctions);
      
    } catch (err) {
      console.error('Error fetching auctions:', err);
      setError(err instanceof Error ? err.message : 'Failed to load auctions');
      
      // Fallback to mock data if API fails
      setAuctions(getMockAuctions());
    } finally {
      setLoading(false);
    }
  };

  const handlePlaceBid = async (auctionId: string) => {
    try {
      // Get current user and authentication tokens
      const { username: userId } = await getCurrentUser();
      const { tokens } = await fetchAuthSession();
      
      if (!tokens?.idToken) {
        toast({
          title: "Authentication required",
          description: "Please sign in to place a bid",
          variant: "destructive"
        });
        return;
      }

      // Get the current auction to show minimum bid
      const auction = auctions.find(a => a.id === auctionId);
      if (!auction) {
        toast({
          title: "Error",
          description: "Auction not found",
          variant: "destructive"
        });
        return;
      }

      const minBid = auction.currentBid + 100; // Minimum increment of R100
      
      const bidAmount = Number(
        prompt(`Enter your bid amount (Minimum: R${minBid.toLocaleString()}):`)
      );
      
      if (!bidAmount || isNaN(bidAmount)) {
        toast({
          title: "Invalid bid",
          description: "Please enter a valid number",
          variant: "destructive"
        });
        return;
      }

      if (bidAmount < minBid) {
        toast({
          title: "Bid too low",
          description: `Bid must be at least R${minBid.toLocaleString()}`,
          variant: "destructive"
        });
        return;
      }

      // Call your existing placeBid API with Cognito authentication
      const response = await fetch(`${API_BASE}/auctions/bid`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${tokens.idToken.toString()}` // Cognito authentication
        },
        body: JSON.stringify({
          auctionId,
          bidAmount,
          bidderId: userId
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to place bid');
      }
      
      const result = await response.json();
      
      toast({
        title: "Success!",
        description: "Your bid has been placed successfully",
      });
      
      // Update local state immediately for better UX
      setAuctions(prev => prev.map(auction => 
        auction.id === auctionId 
          ? { 
              ...auction, 
              currentBid: bidAmount,
              bidders: (auction.bidders || 0) + 1
            }
          : auction
      ));
      
    } catch (error) {
      console.error('Error placing bid:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : 'Failed to place bid',
        variant: "destructive"
      });
    }
  };

  // Fixed filtering with proper logic for location-only searches
  const filteredAuctions = auctions.filter(auction => {
    const searchTerm = searchQuery.toLowerCase();
    const locationTerm = urlLocation.toLowerCase();
    
    // Query matching - only apply if there's a search query
    const matchesQuery = searchQuery ? 
      auction.title.toLowerCase().includes(searchTerm) ||
      auction.artist.toLowerCase().includes(searchTerm) ||
      auction.medium?.toLowerCase().includes(searchTerm)
      : true; // If no search query, match all
    
    // Location matching - only apply if there's a location filter
    const matchesLocation = urlLocation ?
      auction.location.toLowerCase().includes(locationTerm)
      : true; // If no location filter, match all

    // DEBUG LOGGING
    if (urlLocation || searchQuery) {
      console.log('🔍 Search Debug:', {
        auctionTitle: auction.title,
        auctionLocation: auction.location,
        searchQuery,
        searchLocation: urlLocation,
        locationMatch: urlLocation ? auction.location.toLowerCase().includes(locationTerm) : 'N/A',
        queryMatch: searchQuery ? (auction.title.toLowerCase().includes(searchTerm) || auction.artist.toLowerCase().includes(searchTerm) || auction.medium?.toLowerCase().includes(searchTerm)) : 'N/A',
        matchesQuery,
        matchesLocation,
        passes: matchesQuery && matchesLocation
      });
    }
    
    return matchesQuery && matchesLocation;
  });

  // Log all auction locations for debugging
  console.log('📍 All Auction Locations:');
  auctions.forEach((auction, index) => {
    console.log(`${index + 1}. "${auction.title}": Location = "${auction.location}"`);
  });

  // Helper functions for data transformation
  const calculateTimeRemaining = (endTime: string): string => {
    if (!endTime) return "Unknown";
    
    try {
      const end = new Date(endTime);
      const now = new Date();
      const diff = end.getTime() - now.getTime();
      
      if (diff <= 0) return "Ended";
      
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      
      if (days > 0) return `${days}d ${hours}h`;
      if (hours > 0) return `${hours}h ${minutes}m`;
      return `${minutes}m`;
    } catch {
      return "Unknown";
    }
  };

  const getAuctionStatus = (startTime: string, endTime: string): "live" | "upcoming" | "ended" => {
    try {
      const now = new Date();
      const start = startTime ? new Date(startTime) : new Date();
      const end = endTime ? new Date(endTime) : new Date(now.getTime() + 2 * 60 * 60 * 1000);
      
      if (now > end) return "ended";
      if (now >= start) return "live";
      return "upcoming";
    } catch {
      return "upcoming";
    }
  };

  const calculateDistance = (location: string): string => {
    // Simple mock distance calculation
    const distances = ["2.3 km", "5.1 km", "8.7 km", "12.4 km", "15.9 km"];
    return distances[Math.floor(Math.random() * distances.length)];
  };

  const getRandomArtwork = (): string => {
    const artworks = [artwork1, artwork2, artwork3];
    return artworks[Math.floor(Math.random() * artworks.length)];
  };

  // Fallback mock data
  const getMockAuctions = (): Auction[] => [
    {
      id: "1",
      title: "Sunset Over Silicon Valley",
      artist: "Lerato M",
      currentBid: 2450,
      timeRemaining: "2h 45m",
      image: artwork1,
      status: "live",
      location: "Heidedal, BFN",
      distance: "2.3 km",
      medium: "Oil on Canvas",
      year: "2024",
      bidders: 3
    },
    {
      id: "2",
      title: "Urban Dreams",
      artist: "Thato Morogi",
      currentBid: 1200,
      timeRemaining: "1d 12h",
      image: artwork2,
      status: "upcoming",
      location: "Willows, BFN",
      distance: "8.1 km",
      medium: "Acrylic on Canvas",
      year: "2024",
      bidders: 0
    },
    {
      id: "3",
      title: "Coastal Memories",
      artist: "Dineo Motloung",
      currentBid: 890,
      timeRemaining: "4h 20m",
      image: artwork3,
      status: "live",
      location: "Rocklands, BFN",
      distance: "12.5 km",
      medium: "Watercolor",
      year: "2023",
      bidders: 1
    },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto px-4 py-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[...Array(8)].map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-0">
                  <Skeleton className="h-48 w-full rounded-t-lg" />
                  <div className="p-4 space-y-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                    <Skeleton className="h-3 w-1/3" />
                    <Skeleton className="h-6 w-1/4" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  if (error && auctions.length === 0) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto px-4 py-8 text-center">
          <div className="bg-destructive/15 text-destructive p-4 rounded-md max-w-md mx-auto">
            <h3 className="font-semibold">Error Loading Auctions</h3>
            <p className="text-sm mt-1">{error}</p>
            <Button onClick={fetchAuctions} className="mt-4">
              Try Again
            </Button>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <div className="container mx-auto px-4 py-8">
        {/* Search and Filters */}
        <div className="mb-8 space-y-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input 
                placeholder="Search artworks, artists, or styles..."
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="flex space-x-2">
              <Select>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  <SelectItem value="paintings">Paintings</SelectItem>
                  <SelectItem value="sculptures">Sculptures</SelectItem>
                  <SelectItem value="photography">Photography</SelectItem>
                  <SelectItem value="digital">Digital Art</SelectItem>
                </SelectContent>
              </Select>
              
              <Select>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Price" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Prices</SelectItem>
                  <SelectItem value="under500">Under R500</SelectItem>
                  <SelectItem value="500-1000">R500 - R1,000</SelectItem>
                  <SelectItem value="1000-2500">R1,000 - R2,500</SelectItem>
                  <SelectItem value="over2500">Over R2,500</SelectItem>
                </SelectContent>
              </Select>
              
              <Select>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Distance" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Any Distance</SelectItem>
                  <SelectItem value="5">Within 5 km</SelectItem>
                  <SelectItem value="10">Within 10 km</SelectItem>
                  <SelectItem value="25">Within 25 km</SelectItem>
                  <SelectItem value="50">Within 50 km</SelectItem>
                </SelectContent>
              </Select>
              
              <Button variant="outline">
                <Filter className="w-4 h-4 mr-2" />
                More Filters
              </Button>
            </div>
          </div>

          {/* Active Filters */}
          <div className="flex items-center space-x-2">
            <span className="text-sm text-muted-foreground">Active filters:</span>
            {urlLocation && (
              <Badge variant="secondary">
                <MapPin className="w-3 h-3 mr-1" />
                {urlLocation}
              </Badge>
            )}
            {searchQuery && (
              <Badge variant="secondary">
                <Search className="w-3 h-3 mr-1" />
                "{searchQuery}"
              </Badge>
            )}
            <Badge variant="secondary">Live Auctions</Badge>
            {(urlLocation || searchQuery) && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => {
                  setSearchQuery('');
                  window.history.replaceState({}, '', '/browse');
                }}
                className="text-xs"
              >
                Clear all
              </Button>
            )}
          </div>
        </div>

        {/* Results Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="font-playfair text-2xl font-bold">
              {urlLocation || searchQuery ? "Search Results" : "Browse Auctions"}
            </h1>
            <p className="text-muted-foreground">
              {filteredAuctions.length} {filteredAuctions.length === 1 ? 'auction' : 'auctions'} found
              {urlLocation && ` in ${urlLocation}`}
              {searchQuery && ` for "${searchQuery}"`}
            </p>
          </div>
          
          <div className="flex items-center space-x-2">
            <Select defaultValue="ending-soon">
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ending-soon">Ending Soon</SelectItem>
                <SelectItem value="newest">Newest First</SelectItem>
                <SelectItem value="price-low">Price: Low to High</SelectItem>
                <SelectItem value="price-high">Price: High to Low</SelectItem>
                <SelectItem value="distance">Distance</SelectItem>
              </SelectContent>
            </Select>
            
            <div className="flex border rounded-md">
              <Button
                variant={viewMode === "grid" ? "default" : "ghost"}
                size="sm"
                onClick={() => setViewMode("grid")}
                className="rounded-r-none"
              >
                <Grid className="w-4 h-4" />
              </Button>
              <Button
                variant={viewMode === "list" ? "default" : "ghost"}
                size="sm"
                onClick={() => setViewMode("list")}
                className="rounded-l-none"
              >
                <List className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Auction Grid/List */}
        {filteredAuctions.length === 0 ? (
          <div className="text-center py-16">
            <Search className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">No auctions found</h3>
            <p className="text-muted-foreground mb-6">
              {searchQuery || urlLocation ? 
                "Try adjusting your search terms or location" : 
                "No auctions available at the moment"
              }
            </p>
            <Button 
              onClick={() => {
                setSearchQuery('');
                window.history.replaceState({}, '', '/browse');
              }}
            >
              Browse All Auctions
            </Button>
          </div>
        ) : viewMode === "grid" ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredAuctions.map((auction) => (
              <AuctionCard 
                key={auction.id} 
                {...auction} 
                onPlaceBid={handlePlaceBid}
              />
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            {filteredAuctions.map((auction) => (
              <Card key={auction.id} className="hover:shadow-luxury transition-shadow">
                <CardContent className="p-4">
                  <div className="flex space-x-4">
                    <img 
                      src={auction.image} 
                      alt={auction.title}
                      className="w-24 h-24 object-cover rounded-md frame-luxury"
                    />
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg">{auction.title}</h3>
                      <p className="text-muted-foreground">by {auction.artist}</p>
                      <div className="flex items-center mt-1 text-sm text-muted-foreground">
                        <MapPin className="w-3 h-3 mr-1" />
                        {auction.location} • {auction.distance}
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        {auction.medium} • {auction.year}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">Current Bid</p>
                      <p className="text-xl font-bold text-accent">R {auction.currentBid.toLocaleString()}</p>
                      <p className="text-sm text-muted-foreground">{auction.timeRemaining} left</p>
                      <Badge className="mt-2">
                        {auction.status === "live" ? "Live" : auction.status === "ended" ? "Ended" : "Upcoming"}
                      </Badge>
                      <Button 
                        className="mt-4 w-full"
                        onClick={() => handlePlaceBid(auction.id)}
                        disabled={auction.status !== "live"}
                      >
                        {auction.status === "live" ? "Place Bid" : "Auction Ended"}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Load More */}
        {filteredAuctions.length > 0 && (
          <div className="text-center mt-8">
            <Button variant="outline" size="lg" onClick={fetchAuctions}>
              Refresh Auctions
            </Button>
          </div>
        )}
      </div>

      <Footer />
    </div>
  );
};

export default Browse;