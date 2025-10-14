import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { MapPin, Calendar, Award, Users, Heart, Share2, ExternalLink, Instagram, Globe } from "lucide-react";
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
  const [isFollowing, setIsFollowing] = useState(false);

  useEffect(() => {
    if (id) {
      fetchArtistData();
    }
  }, [id]);

  const fetchArtistData = async () => {
    try {
      setLoading(true);
      setError("");
      
      const response = await fetch(`${API_BASE}/auctions`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch auctions: ${response.status}`);
      }
      
      const data = await response.json();
      const auctionData = data.body ? JSON.parse(data.body) : data;
      
      if (!Array.isArray(auctionData)) {
        throw new Error('Invalid data format received from API');
      }

      const artistAuctions = auctionData.filter((auction: any) => 
        auction.artistId === id
      );
      
      if (artistAuctions.length > 0) {
        const firstAuction = artistAuctions[0];
        
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
          profileImage: localStorage.getItem('userAvatar') || "/placeholder-avatar.jpg",
          bio: "A talented artist creating beautiful works. More information coming soon.",
          location: firstAuction.location || "Location not specified",
          createdAt: firstAuction.createdAt || new Date().toISOString(),
          specialties: firstAuction.medium ? [firstAuction.medium] : ["Various Art Forms"],
          achievements: ["Featured Artist on ArtBurst"],
          stats: {
            totalAuctions,
            totalSales,
            avgSalePrice,
            followers: Math.floor(Math.random() * 100) + 50
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
    setIsFollowing(!isFollowing);
    toast({
      title: isFollowing ? "Unfollowed" : "Followed!",
      description: isFollowing 
        ? `You've unfollowed ${artist?.name}` 
        : `You're now following ${artist?.name}`,
    });
  };

  const handleMessage = () => {
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
      <div className="min-h-screen bg-gradient-to-br from-gray-300 to-gray-500">
        <Header />
        <div className="container mx-auto px-4 py-8 max-w-7xl">
          <div className="rounded-2xl p-6 md:p-8 mb-8 backdrop-blur-xl bg-white/20 border border-white/30">
            <div className="flex flex-col md:flex-row gap-6">
              <Skeleton className="w-32 h-32 rounded-2xl mx-auto md:mx-0 flex-shrink-0" />
              <div className="flex-1 space-y-4">
                <Skeleton className="h-8 w-3/4 mx-auto md:mx-0" />
                <Skeleton className="h-4 w-1/2 mx-auto md:mx-0" />
                <Skeleton className="h-20 w-full" />
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-24 rounded-xl backdrop-blur-xl bg-white/20 border border-white/30" />
            ))}
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  if (error || !artist) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-300 to-gray-500">
        <Header />
        <div className="container mx-auto px-4 py-16 text-center max-w-2xl">
          <div className="text-destructive p-8 rounded-2xl backdrop-blur-xl bg-white/20 border border-white/30">
            <h3 className="text-2xl font-bold mb-2">Artist Not Found</h3>
            <p className="text-sm opacity-80 mb-6">{error || "This artist profile doesn't exist."}</p>
            <Button onClick={() => window.history.back()} size="lg" className="btn-primary backdrop-blur-xl bg-white/20 border border-white/30">
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
    <div className="min-h-screen bg-gradient-to-br from-gray-300 to-gray-500">
      <Header />
      
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-10 max-w-7xl">
        {/* Hero Header Section with Gradient Background */}
        <div className="rounded-2xl md:rounded-3xl p-6 md:p-8 lg:p-10 mb-8 shadow-lg backdrop-blur-xl bg-white/20 border border-white/30">
          <div className="flex flex-col md:flex-row gap-6 md:gap-8">
            {/* Enhanced Profile Image with Glow Effect */}
            <div className="flex-shrink-0 mx-auto md:mx-0">
              <div className="relative group">
                <div className="absolute inset-0 bg-gradient-to-br from-accent to-accent/50 rounded-2xl blur-xl opacity-50 group-hover:opacity-75 transition-opacity" />
                <img 
                  src={artist.profileImage || "/placeholder-avatar.jpg"} 
                  alt={artist.name}
                  className="relative w-32 h-32 md:w-40 md:h-40 rounded-2xl object-cover border-4 border-white shadow-xl"
                />
              </div>
            </div>
            
            {/* Artist Info - Enhanced Typography */}
            <div className="flex-1 space-y-4">
              <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                <div className="space-y-3 text-center md:text-left">
                  <h1 className="font-playfair text-3xl md:text-4xl lg:text-5xl font-bold text-foreground">
                    {artist.name}
                  </h1>
                  
                  <div className="flex flex-wrap items-center gap-3 md:gap-4 text-sm text-muted-foreground justify-center md:justify-start">
                    <div className="flex items-center gap-1.5">
                      <MapPin className="w-4 h-4 text-accent" />
                      <span>{artist.location || "Location not specified"}</span>
                    </div>
                    <span className="hidden sm:inline text-accent/30">•</span>
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-4 h-4 text-accent" />
                      <span>Joined {formatDate(artist.createdAt)}</span>
                    </div>
                  </div>
                  
                  {artist.specialties && artist.specialties.length > 0 && (
                    <div className="flex flex-wrap gap-2 justify-center md:justify-start">
                      {artist.specialties.map((specialty) => (
                        <Badge key={specialty} variant="secondary" className="text-xs px-3 py-1 backdrop-blur-xl bg-white/20 border border-white/30">
                          {specialty}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
                
                {/* Enhanced Action Buttons */}
                <div className="flex flex-col sm:flex-row gap-2 lg:gap-3 justify-center lg:justify-end">
                  <Button 
                    variant={isFollowing ? "default" : "outline"} 
                    size="lg" 
                    className="gap-2 backdrop-blur-xl bg-white/20 border border-white/30"
                    onClick={handleFollow}
                  >
                    <Heart className={`w-4 h-4 ${isFollowing ? 'fill-current' : ''}`} />
                    <span className="hidden sm:inline">{isFollowing ? 'Following' : 'Follow'}</span>
                    <span className="text-xs opacity-75">({stats.followers})</span>
                  </Button>
                  <ShareProfileButton 
                    artistId={artist.artistId} 
                    artistName={artist.name} 
                  />
                  <Button className="btn-primary gap-2 backdrop-blur-xl bg-white/20 border border-white/30" size="lg" onClick={handleMessage}>
                    Message
                  </Button>
                </div>
              </div>
              
              {artist.bio && (
                <p className="text-muted-foreground leading-relaxed text-center md:text-left max-w-3xl">
                  {artist.bio}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Enhanced Stats Grid with Hover Effects */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 lg:gap-6 mb-10">
          {[
            { label: 'Total Auctions', value: stats.totalAuctions, prefix: '' },
            { label: 'Total Sales', value: stats.totalSales, prefix: 'R' },
            { label: 'Avg. Sale Price', value: stats.avgSalePrice, prefix: 'R' },
            { label: 'Followers', value: stats.followers, prefix: '' }
          ].map((stat, index) => (
            <Card key={index} className="group hover:shadow-2xl hover:scale-105 transition-all duration-300 backdrop-blur-xl bg-white/20 border border-white/30">
              <CardContent className="p-4 md:p-6 text-center">
                <div className="text-2xl md:text-3xl lg:text-4xl font-bold text-accent mb-1 group-hover:scale-110 transition-transform">
                  {stat.prefix}{stat.value.toLocaleString()}
                </div>
                <div className="text-xs md:text-sm text-muted-foreground font-medium">
                  {stat.label}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Enhanced Tabs */}
        <Tabs defaultValue="auctions" className="space-y-8">
          <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 h-auto p-1 backdrop-blur-xl bg-white/20 border border-white/30">
            <TabsTrigger value="auctions" className="text-sm md:text-base py-3 md:py-4 data-[state=active]:bg-accent data-[state=active]:text-white">
              Active Auctions
            </TabsTrigger>
            <TabsTrigger value="portfolio" className="text-sm md:text-base py-3 md:py-4 data-[state=active]:bg-accent data-[state=active]:text-white">
              Portfolio
            </TabsTrigger>
            <TabsTrigger value="sold" className="text-sm md:text-base py-3 md:py-4 data-[state=active]:bg-accent data-[state=active]:text-white">
              Sold Works
            </TabsTrigger>
            <TabsTrigger value="about" className="text-sm md:text-base py-3 md:py-4 data-[state=active]:bg-accent data-[state=active]:text-white">
              About
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="auctions" className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="font-playfair text-2xl md:text-3xl font-bold text-foreground">Active Auctions</h2>
              <Badge variant="secondary" className="text-sm px-3 py-1 backdrop-blur-xl bg-white/20 border border-white/30">{activeAuctions.length} Active</Badge>
            </div>
            
            {activeAuctions.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
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
              <Card className="border-dashed border-2 backdrop-blur-xl bg-white/20 border border-white/30">
                <CardContent className="p-12 text-center">
                  <div className="w-16 h-16 bg-accent/10 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Users className="w-8 h-8 text-accent" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">No Active Auctions</h3>
                  <p className="text-muted-foreground mb-6">This artist doesn't have any active auctions at the moment.</p>
                  <Button onClick={handleFollow} size="lg" className="btn-primary backdrop-blur-xl bg-white/20 border border-white/30">
                    <Heart className="w-4 h-4 mr-2" />
                    Follow for Updates
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>
          
          <TabsContent value="portfolio" className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="font-playfair text-2xl md:text-3xl font-bold text-foreground">Portfolio</h2>
              <Badge variant="secondary" className="text-sm px-3 py-1 backdrop-blur-xl bg-white/20 border border-white/30">{availableWorks.length} Works</Badge>
            </div>
            
            {availableWorks.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                {availableWorks.map((artwork) => (
                  <Card key={artwork.id} className="group overflow-hidden hover:shadow-2xl transition-all duration-300 backdrop-blur-xl bg-white/20 border border-white/30">
                    <div className="relative aspect-square overflow-hidden bg-muted">
                      <img 
                        src={artwork.image} 
                        alt={artwork.title}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/0 to-black/0 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                    <CardContent className="p-4 md:p-5">
                      <h3 className="font-semibold text-foreground text-base md:text-lg mb-1 line-clamp-1">{artwork.title}</h3>
                      <p className="text-sm text-muted-foreground mb-3">
                        {artwork.year} • {artwork.medium}
                      </p>
                      {artwork.price && (
                        <div className="flex items-center justify-between">
                          <p className="text-xl md:text-2xl font-bold text-accent">
                            R{artwork.price.toLocaleString()}
                          </p>
                          <Button size="sm" variant="ghost" className="opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-xl bg-white/20 border border-white/30">
                            View
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card className="border-dashed border-2 backdrop-blur-xl bg-white/20 border border-white/30">
                <CardContent className="p-12 text-center">
                  <p className="text-muted-foreground text-lg">No available works in portfolio.</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
          
          <TabsContent value="sold" className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="font-playfair text-2xl md:text-3xl font-bold text-foreground">Sold Works</h2>
              <Badge variant="secondary" className="text-sm px-3 py-1 backdrop-blur-xl bg-white/20 border border-white/30">{soldWorks.length} Sold</Badge>
            </div>
            
            {soldWorks.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                {soldWorks.map((artwork) => (
                  <Card key={artwork.id} className="group overflow-hidden hover:shadow-2xl transition-all duration-300 backdrop-blur-xl bg-white/20 border border-white/30">
                    <div className="relative aspect-square overflow-hidden bg-muted">
                      <img 
                        src={artwork.image} 
                        alt={artwork.title}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                      />
                      <Badge className="absolute top-3 right-3 bg-red-500 text-white border-0 shadow-lg backdrop-blur-xl bg-white/20 border border-white/30">
                        Sold
                      </Badge>
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/0 to-black/0 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                    <CardContent className="p-4 md:p-5">
                      <h3 className="font-semibold text-foreground text-base md:text-lg mb-1 line-clamp-1">{artwork.title}</h3>
                      <p className="text-sm text-muted-foreground mb-3">
                        {artwork.year} • {artwork.medium}
                      </p>
                      {artwork.price && (
                        <p className="text-xl md:text-2xl font-bold text-accent">
                          R{artwork.price.toLocaleString()}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card className="border-dashed border-2 backdrop-blur-xl bg-white/20 border border-white/30">
                <CardContent className="p-12 text-center">
                  <p className="text-muted-foreground text-lg">No sold works yet.</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
          
          <TabsContent value="about" className="space-y-6">
            <h2 className="font-playfair text-2xl md:text-3xl font-bold text-foreground">About the Artist</h2>
            
            <div className="grid md:grid-cols-2 gap-6">
              {artist.bio && (
                <Card className="md:col-span-2 backdrop-blur-xl bg-white/20 border border-white/30">
                  <CardContent className="p-6 md:p-8">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 bg-accent/10 rounded-lg flex items-center justify-center">
                        <Users className="w-5 h-5 text-accent" />
                      </div>
                      <h3 className="font-semibold text-xl text-foreground">Biography</h3>
                    </div>
                    <p className="text-muted-foreground leading-relaxed text-base">{artist.bio}</p>
                  </CardContent>
                </Card>
              )}
              
              {artist.achievements && artist.achievements.length > 0 && (
                <Card className="backdrop-blur-xl bg-white/20 border border-white/30">
                  <CardContent className="p-6 md:p-8">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 bg-accent/10 rounded-lg flex items-center justify-center">
                        <Award className="w-5 h-5 text-accent" />
                      </div>
                      <h3 className="font-semibold text-xl text-foreground">Achievements</h3>
                    </div>
                    <ul className="space-y-3">
                      {artist.achievements.map((achievement, index) => (
                        <li key={index} className="flex items-start gap-3 text-muted-foreground">
                          <div className="w-2 h-2 bg-accent rounded-full mt-2 flex-shrink-0" />
                          <span>{achievement}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}
              
              <Card className="backdrop-blur-xl bg-white/20 border border-white/30">
                <CardContent className="p-6 md:p-8">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-accent/10 rounded-lg flex items-center justify-center">
                      <Share2 className="w-5 h-5 text-accent" />
                    </div>
                    <h3 className="font-semibold text-xl text-foreground">Connect</h3>
                  </div>
                  <div className="space-y-3">
                    {artist.website && (
                      <a 
                        href={artist.website} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="flex items-center gap-3 text-muted-foreground hover:text-accent transition-colors group"
                      >
                        <Globe className="w-5 h-5 flex-shrink-0" />
                        <span className="group-hover:underline break-all">{artist.website}</span>
                        <ExternalLink className="w-4 h-4 ml-auto flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </a>
                    )}
                    {artist.instagram && (
                      <a 
                        href={`https://instagram.com/${artist.instagram.replace('@', '')}`}
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="flex items-center gap-3 text-muted-foreground hover:text-accent transition-colors group"
                      >
                        <Instagram className="w-5 h-5 flex-shrink-0" />
                        <span className="group-hover:underline break-all">{artist.instagram}</span>
                        <ExternalLink className="w-4 h-4 ml-auto flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </a>
                    )}
                    {artist.email && (
                      <a 
                        href={`mailto:${artist.email}`}
                        className="flex items-center gap-3 text-muted-foreground hover:text-accent transition-colors group"
                      >
                        <div className="w-5 h-5 flex-shrink-0">✉️</div>
                        <span className="group-hover:underline break-all">{artist.email}</span>
                      </a>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      <Footer />
    </div>
  );
};

export default ArtistProfile;