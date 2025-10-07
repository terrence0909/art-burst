import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Search, Filter, MapPin, Grid, List, X } from "lucide-react";
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

// Update this to your API Gateway endpoint
const API_BASE = "/api";

interface Auction {
  id: string;
  title: string;
  artist: string;
  artistId?: string;
  currentBid: number;
  timeRemaining: string;
  image: string;
  status: "live" | "upcoming" | "ended";
  location: string;
  distance: string;
  medium?: string;
  year?: string;
  bidders?: number;
  startDate?: string;
  endDate?: string;
  highestBidder?: string;
}

// Filter state interface
interface Filters {
  category: string;
  priceRange: string;
  distance: string;
  status: string;
  sortBy: string;
}

const Browse = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const urlQuery = searchParams.get('query') || '';
  const urlLocation = searchParams.get('location') || '';
  
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [searchQuery, setSearchQuery] = useState(urlQuery);
  const [auctions, setAuctions] = useState<Auction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  
  // Filter states
  const [filters, setFilters] = useState<Filters>({
    category: "all",
    priceRange: "all",
    distance: "all",
    status: "all",
    sortBy: "ending-soon"
  });
  const [showMoreFilters, setShowMoreFilters] = useState(false);

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
      setError("");
      
      const response = await fetch(`${API_BASE}/auctions`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch auctions: ${response.status}`);
      }
      
      const data = await response.json();
      
      // Handle both Lambda proxy format and direct array response
      const auctionData = data.body ? JSON.parse(data.body) : data;
      
      if (!Array.isArray(auctionData)) {
        throw new Error('Invalid data format received from API');
      }

      // Use EXACT same data as AuctionGrid - no recalculation
      const transformedAuctions: Auction[] = auctionData.map((auction: any) => ({
        id: auction.auctionId || auction.id,
        title: auction.title || `Auction ${auction.auctionId}`,
        artist: auction.artistName || auction.artist || "Unknown Artist",
        artistId: auction.artistId,
        currentBid: auction.currentBid || auction.startingBid || 0,
        // Use the exact timeRemaining from API (same as grid)
        timeRemaining: auction.timeRemaining || "",
        image: auction.image || (auction.images && auction.images[0]) || '/placeholder-artwork.jpg',
        // Use the exact status from API (same as grid)
        status: auction.status || "upcoming",
        location: auction.location || "Location not specified",
        distance: auction.distance || "0 km",
        medium: auction.medium,
        year: auction.year,
        bidders: auction.bidders || auction.bidCount || 0,
        // Include additional fields that AuctionCard might need
        startDate: auction.startDate,
        endDate: auction.endDate,
        highestBidder: auction.highestBidder
      }));
      
      setAuctions(transformedAuctions);
      
    } catch (err) {
      console.error('Error fetching auctions:', err);
      setError(err instanceof Error ? err.message : 'Failed to load auctions');
      setAuctions([]); // Clear auctions on error
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

  // Enhanced filtering with all filters
  const filteredAuctions = auctions.filter(auction => {
    const searchTerm = searchQuery.toLowerCase();
    const locationTerm = urlLocation.toLowerCase();
    
    // Query matching
    const matchesQuery = searchQuery ? 
      auction.title.toLowerCase().includes(searchTerm) ||
      auction.artist.toLowerCase().includes(searchTerm) ||
      auction.medium?.toLowerCase().includes(searchTerm)
      : true;
    
    // Location matching
    const matchesLocation = urlLocation ?
      auction.location.toLowerCase().includes(locationTerm)
      : true;

    // Category filter
    const matchesCategory = filters.category === "all" || 
      (filters.category === "paintings" && auction.medium?.toLowerCase().includes("oil")) ||
      (filters.category === "paintings" && auction.medium?.toLowerCase().includes("acrylic")) ||
      (filters.category === "paintings" && auction.medium?.toLowerCase().includes("watercolor")) ||
      (filters.category === "sculptures" && auction.medium?.toLowerCase().includes("sculpture")) ||
      (filters.category === "photography" && auction.medium?.toLowerCase().includes("photo")) ||
      (filters.category === "digital" && auction.medium?.toLowerCase().includes("digital"));

    // Price range filter
    const matchesPrice = filters.priceRange === "all" ||
      (filters.priceRange === "under500" && auction.currentBid < 500) ||
      (filters.priceRange === "500-1000" && auction.currentBid >= 500 && auction.currentBid <= 1000) ||
      (filters.priceRange === "1000-2500" && auction.currentBid >= 1000 && auction.currentBid <= 2500) ||
      (filters.priceRange === "over2500" && auction.currentBid > 2500);

    // Status filter
    const matchesStatus = filters.status === "all" || auction.status === filters.status;

    // Distance filter (simplified - using numeric distance)
    const auctionDistance = parseFloat(auction.distance.split(' ')[0]);
    const matchesDistance = filters.distance === "all" ||
      (filters.distance === "5" && auctionDistance <= 5) ||
      (filters.distance === "10" && auctionDistance <= 10) ||
      (filters.distance === "25" && auctionDistance <= 25) ||
      (filters.distance === "50" && auctionDistance <= 50);

    return matchesQuery && matchesLocation && matchesCategory && matchesPrice && matchesStatus && matchesDistance;
  });

  // Sorting function
  const sortedAuctions = [...filteredAuctions].sort((a, b) => {
    switch (filters.sortBy) {
      case "ending-soon":
        return a.timeRemaining.localeCompare(b.timeRemaining);
      case "newest":
        return b.id.localeCompare(a.id);
      case "price-low":
        return a.currentBid - b.currentBid;
      case "price-high":
        return b.currentBid - a.currentBid;
      case "distance":
        const aDist = parseFloat(a.distance.split(' ')[0]);
        const bDist = parseFloat(b.distance.split(' ')[0]);
        return aDist - bDist;
      default:
        return 0;
    }
  });

  // Update URL when search changes
  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    if (value) {
      searchParams.set('query', value);
    } else {
      searchParams.delete('query');
    }
    setSearchParams(searchParams);
  };

  // Clear all filters
  const clearAllFilters = () => {
    setSearchQuery('');
    setFilters({
      category: "all",
      priceRange: "all",
      distance: "all",
      status: "all",
      sortBy: "ending-soon"
    });
    setSearchParams({});
  };

  // Check if any filters are active
  const hasActiveFilters = searchQuery || urlLocation || 
    Object.values(filters).some(filter => filter !== "all");

  // Remove individual filter
  const removeFilter = (filterType: keyof Filters) => {
    setFilters(prev => ({ ...prev, [filterType]: "all" }));
  };

  // Simple distance calculation (same as grid might use)
  const calculateDistance = (location: string): string => {
    const distances = ["2.3 km", "5.1 km", "8.7 km", "12.4 km", "15.9 km"];
    return distances[Math.floor(Math.random() * distances.length)];
  };

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
                onChange={(e) => handleSearchChange(e.target.value)}
              />
            </div>
            <div className="flex space-x-2">
              <Select 
                value={filters.category} 
                onValueChange={(value) => setFilters(prev => ({ ...prev, category: value }))}
              >
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
              
              <Select 
                value={filters.priceRange} 
                onValueChange={(value) => setFilters(prev => ({ ...prev, priceRange: value }))}
              >
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
              
              <Select 
                value={filters.distance} 
                onValueChange={(value) => setFilters(prev => ({ ...prev, distance: value }))}
              >
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
              
              <Button 
                variant="outline" 
                onClick={() => setShowMoreFilters(!showMoreFilters)}
              >
                <Filter className="w-4 h-4 mr-2" />
                More Filters
              </Button>
            </div>
          </div>

          {/* More Filters Dropdown */}
          {showMoreFilters && (
            <div className="bg-muted/50 p-4 rounded-lg space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Auction Status</label>
                  <Select 
                    value={filters.status} 
                    onValueChange={(value) => setFilters(prev => ({ ...prev, status: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      <SelectItem value="live">Live Only</SelectItem>
                      <SelectItem value="upcoming">Upcoming</SelectItem>
                      <SelectItem value="ended">Ended</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <label className="text-sm font-medium mb-2 block">Sort By</label>
                  <Select 
                    value={filters.sortBy} 
                    onValueChange={(value) => setFilters(prev => ({ ...prev, sortBy: value }))}
                  >
                    <SelectTrigger>
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
                </div>
                
                <div className="flex items-end">
                  <Button 
                    variant="outline" 
                    onClick={clearAllFilters}
                    className="w-full"
                  >
                    Clear All Filters
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Active Filters */}
          {hasActiveFilters && (
            <div className="flex items-center space-x-2 flex-wrap gap-2">
              <span className="text-sm text-muted-foreground">Active filters:</span>
              
              {urlLocation && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  {urlLocation}
                  <X className="w-3 h-3 ml-1 cursor-pointer" onClick={() => setSearchParams(prev => {
                    prev.delete('location');
                    return prev;
                  })} />
                </Badge>
              )}
              
              {searchQuery && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  <Search className="w-3 h-3" />
                  "{searchQuery}"
                  <X className="w-3 h-3 ml-1 cursor-pointer" onClick={() => handleSearchChange('')} />
                </Badge>
              )}
              
              {filters.category !== "all" && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  Category: {filters.category}
                  <X className="w-3 h-3 ml-1 cursor-pointer" onClick={() => removeFilter('category')} />
                </Badge>
              )}
              
              {filters.priceRange !== "all" && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  Price: {filters.priceRange}
                  <X className="w-3 h-3 ml-1 cursor-pointer" onClick={() => removeFilter('priceRange')} />
                </Badge>
              )}
              
              {filters.distance !== "all" && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  Distance: {filters.distance}km
                  <X className="w-3 h-3 ml-1 cursor-pointer" onClick={() => removeFilter('distance')} />
                </Badge>
              )}
              
              {filters.status !== "all" && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  Status: {filters.status}
                  <X className="w-3 h-3 ml-1 cursor-pointer" onClick={() => removeFilter('status')} />
                </Badge>
              )}
              
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={clearAllFilters}
                className="text-xs"
              >
                Clear all
              </Button>
            </div>
          )}
        </div>

        {/* Results Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="font-playfair text-2xl font-bold">
              {urlLocation || searchQuery || hasActiveFilters ? "Search Results" : "Browse Auctions"}
            </h1>
            <p className="text-muted-foreground">
              {sortedAuctions.length} {sortedAuctions.length === 1 ? 'auction' : 'auctions'} found
              {urlLocation && ` in ${urlLocation}`}
              {searchQuery && ` for "${searchQuery}"`}
            </p>
          </div>
          
          <div className="flex items-center space-x-2">
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
        {sortedAuctions.length === 0 ? (
          <div className="text-center py-16">
            <Search className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">No auctions found</h3>
            <p className="text-muted-foreground mb-6">
              {searchQuery || urlLocation || hasActiveFilters ? 
                "Try adjusting your search terms or filters" : 
                "No auctions available at the moment"
              }
            </p>
            <Button onClick={clearAllFilters}>
              Browse All Auctions
            </Button>
          </div>
        ) : viewMode === "grid" ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {sortedAuctions.map((auction) => (
              <AuctionCard 
                key={auction.id} 
                {...auction} 
                artistId={auction.artistId}
                onPlaceBid={handlePlaceBid}
              />
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            {sortedAuctions.map((auction) => (
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

        {/* Refresh Button */}
        {sortedAuctions.length > 0 && (
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