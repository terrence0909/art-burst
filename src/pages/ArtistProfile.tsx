import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { MapPin, Calendar, Award, Users, Heart, Share2, Loader } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { AuctionCard } from "@/components/AuctionCard";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/components/ui/use-toast";
import { ShareProfileButton } from "@/components/ShareProfileButton";

const API_BASE = "/api";

interface Artist {
  artistId: string;
  name: string;
  email: string;
  profileImage?: string;
  bio?: string;
  location?: string;
  createdAt: string;
  specialties?: string[];
  achievements?: string[];
  website?: string;
  instagram?: string;
  stats?: {
    totalAuctions: number;
    totalSales: number;
    avgSalePrice: number;
    followers: number;
  };
}

interface Artwork {
  id: string;
  title: string;
  image: string;
  year?: string;
  medium?: string;
  sold: boolean;
  price?: number;
}

const ArtistProfile = () => {
  const { id } = useParams();
  const [artist, setArtist] = useState<Artist | null>(null);
  const [artistAuctions, setArtistAuctions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (id) {
      fetchArtistData();
    }
  }, [id]);

  const fetchArtistData = async () => {
    try {
      setLoading(true);
      setError("");
      
      // Get artist data from auctions
      const response = await fetch(`${API_BASE}/auctions`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch auctions: ${response.status}`);
      }
      
      const data = await response.json();
      const auctionData = data.body ? JSON.parse(data.body) : data;
      
      if (!Array.isArray(auctionData)) {
        throw new Error('Invalid data format received from API');
      }

      // Find auctions by this artist
      const artistAuctions = auctionData.filter((auction: any) => 
        auction.artistId === id
      );
      
      if (artistAuctions.length > 0) {
        // Create artist data from the auctions
        const firstAuction = artistAuctions[0];
        
        // Calculate stats
        const totalAuctions = artistAuctions.length;
        const soldAuctions = artistAuctions.filter((a: any) => 
          a.status === "ended" || a.status === "sold"
        );
        const totalSales = soldAuctions.reduce((sum: number, auction: any) => 
          sum + (auction.currentBid || auction.startingBid || 0), 0
        );
        const avgSalePrice = soldAuctions.length > 0 
          ? Math.round(totalSales / soldAuctions.length)
          : 0;

        const artistData: Artist = {
          artistId: id!,
          name: firstAuction.artistName || "Unknown Artist",
          email: "",
          profileImage: "/placeholder-avatar.jpg",
          bio: "A talented artist creating beautiful works. More information coming soon.",
          location: firstAuction.location || "Location not specified",
          createdAt: firstAuction.createdAt || new Date().toISOString(),
          specialties: firstAuction.medium ? [firstAuction.medium] : ["Various Art Forms"],
          achievements: ["Featured Artist on ArtBurst"],
          stats: {
            totalAuctions,
            totalSales,
            avgSalePrice,
            followers: Math.floor(Math.random() * 100) + 50 // Random followers for now
          }
        };
        
        setArtist(artistData);
        setArtistAuctions(artistAuctions);
      } else {
        throw new Error("No auctions found for this artist");
      }
      
    } catch (err) {
      console.error('Error fetching artist:', err);
      setError(err instanceof Error ? err.message : 'Failed to load artist profile');
    } finally {
      setLoading(false);
    }
  };

  const handleFollow = async () => {
    try {
      // Implement follow functionality
      toast({
        title: "Followed!",
        description: `You're now following ${artist?.name}`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to follow artist",
        variant: "destructive"
      });
    }
  };

  const handleMessage = () => {
    // Implement message functionality
    toast({
      title: "Message",
      description: "Message feature coming soon!",
    });
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.getFullYear().toString();
    } catch {
      return "Unknown";
    }
  };

  // Transform auctions to portfolio items
  const portfolio: Artwork[] = artistAuctions.map((auction: any) => ({
    id: auction.auctionId,
    title: auction.title,
    image: auction.image || (auction.images && auction.images[0]) || '/placeholder-artwork.jpg',
    year: auction.year,
    medium: auction.medium,
    sold: auction.status === "ended" || auction.status === "sold",
    price: auction.currentBid || auction.startingBid
  }));

  const activeAuctions = artistAuctions.filter((auction: any) => 
    auction.status === "active" || auction.status === "live"
  );

  const soldWorks = portfolio.filter(item => item.sold);
  const availableWorks = portfolio.filter(item => !item.sold);

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto px-4 py-8">
          <div className="flex flex-col md:flex-row gap-8 mb-8">
            <Skeleton className="w-32 h-32 rounded-full" />
            <div className="flex-1 space-y-4">
              <Skeleton className="h-8 w-64" />
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-20 w-full" />
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-20" />
            ))}
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  if (error || !artist) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto px-4 py-8 text-center">
          <div className="bg-destructive/15 text-destructive p-4 rounded-md max-w-md mx-auto">
            <h3 className="font-semibold">Artist Not Found</h3>
            <p className="text-sm mt-1">{error || "This artist profile doesn't exist."}</p>
            <Button onClick={() => window.history.back()} className="mt-4">
              Go Back
            </Button>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  const stats = artist.stats || {
    totalAuctions: artistAuctions.length,
    totalSales: 0,
    avgSalePrice: 0,
    followers: 0
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <div className="container mx-auto px-4 py-8">
        {/* Artist Header */}
        <div className="flex flex-col md:flex-row gap-8 mb-8">
          <div className="flex-shrink-0">
            <img 
              src={artist.profileImage || "/placeholder-avatar.jpg"} 
              alt={artist.name}
              className="w-32 h-32 rounded-full object-cover border-4 border-accent"
            />
          </div>
          
          <div className="flex-1">
            <div className="flex flex-col md:flex-row md:items-start md:justify-between">
              <div>
                <h1 className="font-playfair text-3xl font-bold mb-2 text-foreground">
                  {artist.name}
                </h1>
                <div className="flex items-center text-muted-foreground mb-3">
                  <MapPin className="w-4 h-4 mr-1" />
                  {artist.location || "Location not specified"}
                </div>
                <div className="flex items-center text-muted-foreground mb-4">
                  <Calendar className="w-4 h-4 mr-1" />
                  Member since {formatDate(artist.createdAt)}
                </div>
                {artist.specialties && artist.specialties.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-4">
                    {artist.specialties.map((specialty) => (
                      <Badge key={specialty} variant="secondary">{specialty}</Badge>
                    ))}
                  </div>
                )}
              </div>
              
              <div className="flex space-x-2 mt-4 md:mt-0">
                <Button variant="outline" onClick={handleFollow}>
                  <Heart className="w-4 h-4 mr-2" />
                  Follow ({stats.followers})
                </Button>
                {/* Replaced Share button with QR code share button */}
                <ShareProfileButton 
                  artistId={artist.artistId} 
                  artistName={artist.name} 
                />
                <Button className="btn-primary" onClick={handleMessage}>
                  Message Artist
                </Button>
              </div>
            </div>
            
            {artist.bio && (
              <p className="text-muted-foreground mt-4">{artist.bio}</p>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-accent">{stats.totalAuctions}</p>
              <p className="text-sm text-muted-foreground">Total Auctions</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-accent">R{stats.totalSales.toLocaleString()}</p>
              <p className="text-sm text-muted-foreground">Total Sales</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-accent">R{stats.avgSalePrice.toLocaleString()}</p>
              <p className="text-sm text-muted-foreground">Avg. Sale Price</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-accent">{stats.followers}</p>
              <p className="text-sm text-muted-foreground">Followers</p>
            </CardContent>
          </Card>
        </div>

        {/* Content Tabs */}
        <Tabs defaultValue="auctions" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="auctions">Active Auctions</TabsTrigger>
            <TabsTrigger value="portfolio">Portfolio</TabsTrigger>
            <TabsTrigger value="sold">Sold Works</TabsTrigger>
            <TabsTrigger value="about">About</TabsTrigger>
          </TabsList>
          
          <TabsContent value="auctions" className="space-y-6">
            <h2 className="font-playfair text-2xl font-bold text-foreground">Active Auctions</h2>
            {activeAuctions.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {activeAuctions.map((auction) => (
                  <AuctionCard 
                    key={auction.auctionId} 
                    id={auction.auctionId}
                    title={auction.title}
                    artist={artist.name}
                    artistId={artist.artistId}
                    currentBid={auction.currentBid || auction.startingBid}
                    timeRemaining={auction.endDate ? "Ending soon" : "Unknown"}
                    image={auction.image || (auction.images && auction.images[0])}
                    status="live"
                    location={artist.location || "Unknown"}
                    distance="0 km"
                    bidders={auction.bidCount || 0}
                  />
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="p-8 text-center">
                  <p className="text-muted-foreground">No active auctions at the moment.</p>
                  <Button className="mt-4" onClick={handleFollow}>Follow for Updates</Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>
          
          <TabsContent value="portfolio" className="space-y-6">
            <h2 className="font-playfair text-2xl font-bold text-foreground">Portfolio</h2>
            {availableWorks.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {availableWorks.map((artwork) => (
                  <Card key={artwork.id} className="overflow-hidden hover:shadow-luxury transition-shadow">
                    <div className="relative">
                      <img 
                        src={artwork.image} 
                        alt={artwork.title}
                        className="w-full h-64 object-cover"
                      />
                      {artwork.sold && (
                        <Badge className="absolute top-2 right-2 bg-red-500">Sold</Badge>
                      )}
                    </div>
                    <CardContent className="p-4">
                      <h3 className="font-semibold text-foreground">{artwork.title}</h3>
                      <p className="text-sm text-muted-foreground">
                        {artwork.year} • {artwork.medium}
                      </p>
                      {artwork.price && (
                        <p className="text-lg font-bold text-accent mt-2">
                          R{artwork.price.toLocaleString()}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="p-8 text-center">
                  <p className="text-muted-foreground">No available works in portfolio.</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
          
          <TabsContent value="sold" className="space-y-6">
            <h2 className="font-playfair text-2xl font-bold text-foreground">Sold Works</h2>
            {soldWorks.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {soldWorks.map((artwork) => (
                  <Card key={artwork.id} className="overflow-hidden hover:shadow-luxury transition-shadow">
                    <div className="relative">
                      <img 
                        src={artwork.image} 
                        alt={artwork.title}
                        className="w-full h-64 object-cover"
                      />
                      <Badge className="absolute top-2 right-2 bg-red-500">Sold</Badge>
                    </div>
                    <CardContent className="p-4">
                      <h3 className="font-semibold text-foreground">{artwork.title}</h3>
                      <p className="text-sm text-muted-foreground">
                        {artwork.year} • {artwork.medium}
                      </p>
                      {artwork.price && (
                        <p className="text-lg font-bold text-accent mt-2">
                          R{artwork.price.toLocaleString()}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="p-8 text-center">
                  <p className="text-muted-foreground">No sold works yet.</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
          
          <TabsContent value="about" className="space-y-6">
            <h2 className="font-playfair text-2xl font-bold text-foreground">About the Artist</h2>
            <Card>
              <CardContent className="p-6 space-y-6">
                {artist.bio && (
                  <div>
                    <h3 className="font-semibold mb-2 text-foreground">Biography</h3>
                    <p className="text-muted-foreground">{artist.bio}</p>
                  </div>
                )}
                
                {artist.achievements && artist.achievements.length > 0 && (
                  <div>
                    <h3 className="font-semibold mb-2 text-foreground">Achievements</h3>
                    <ul className="space-y-1">
                      {artist.achievements.map((achievement, index) => (
                        <li key={index} className="flex items-center text-muted-foreground">
                          <Award className="w-4 h-4 mr-2 text-accent" />
                          {achievement}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                
                <div>
                  <h3 className="font-semibold mb-2 text-foreground">Connect</h3>
                  <div className="space-y-2">
                    {artist.website && (
                      <p className="text-muted-foreground">Website: {artist.website}</p>
                    )}
                    {artist.instagram && (
                      <p className="text-muted-foreground">Instagram: {artist.instagram}</p>
                    )}
                    {artist.email && (
                      <p className="text-muted-foreground">Email: {artist.email}</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <Footer />
    </div>
  );
};

export default ArtistProfile;