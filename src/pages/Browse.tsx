import { useState } from "react";
import { Search, Filter, MapPin, Grid, List } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { AuctionCard } from "@/components/AuctionCard";
import artwork1 from "@/assets/artwork-1.jpeg";
import artwork2 from "@/assets/artwork-2.jpeg";
import artwork3 from "@/assets/artwork-3.jpeg";

const Browse = () => {
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [searchQuery, setSearchQuery] = useState("");

  // Mock data - would come from API
  const auctions = [
    {
      id: "1",
      title: "Sunset Over Silicon Valley",
      artist: "Lerato M",
      currentBid: 2450,
      timeRemaining: "2h 45m",
      image: artwork1,
      status: "live" as const,
      location: "Heidedal, BFN",
      distance: "2.3 km",
      medium: "Oil on Canvas",
      year: "2024"
    },
    {
      id: "2",
      title: "Urban Dreams",
      artist: "Thato Morogi",
      currentBid: 1200,
      timeRemaining: "1d 12h",
      image: artwork2,
      status: "upcoming" as const,
      location: "Willows, BFN",
      distance: "8.1 km",
      medium: "Acrylic on Canvas",
      year: "2024"
    },
    {
      id: "3",
      title: "Coastal Memories",
      artist: "Dineo Motloung",
      currentBid: 890,
      timeRemaining: "4h 20m",
      image: artwork3,
      status: "live" as const,
      location: "Rocklands, BFN",
      distance: "12.5 km",
      medium: "Watercolor",
      year: "2023"
    },
    // Add more mock data...
  ];

  const filteredAuctions = auctions.filter(auction =>
    auction.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    auction.artist.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
            <Badge variant="secondary">
              <MapPin className="w-3 h-3 mr-1" />
              Bloemfontein, SA
            </Badge>
            <Badge variant="secondary">Live Auctions</Badge>
          </div>
        </div>

        {/* Results Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="font-playfair text-2xl font-bold">Browse Auctions</h1>
            <p className="text-muted-foreground">{filteredAuctions.length} auctions found</p>
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
        {viewMode === "grid" ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredAuctions.map((auction) => (
              <AuctionCard key={auction.id} {...auction} />
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
                      <p className="text-xl font-bold text-accent">${auction.currentBid.toLocaleString()}</p>
                      <p className="text-sm text-muted-foreground">{auction.timeRemaining} left</p>
                      <Badge className="mt-2">
                        {auction.status === "live" ? "Live" : "Upcoming"}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Load More */}
        <div className="text-center mt-8">
          <Button variant="outline" size="lg">
            Load More Auctions
          </Button>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default Browse;