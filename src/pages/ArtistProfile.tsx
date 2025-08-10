import { useParams } from "react-router-dom";
import { MapPin, Calendar, Award, Users, Heart, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { AuctionCard } from "@/components/AuctionCard";
import artwork1 from "@/assets/artwork-1.jpeg";
import artwork2 from "@/assets/artwork-2.jpeg";
import artwork3 from "@/assets/artwork-3.jpeg";

const ArtistProfile = () => {
  const { id } = useParams();

  // Mock artist data - would come from API
  const artist = {
    id: id,
    name: "Maria Rodriguez",
    profileImage: "https://images.unsplash.com/photo-1494790108755-2616b612b786?w=400&h=400&fit=crop&crop=face",
    bio: "Maria Rodriguez is a contemporary artist based in San Francisco, known for her vibrant oil paintings that capture the essence of California's natural beauty and urban landscapes. Her work has been featured in galleries across the Bay Area.",
    location: "San Francisco, CA",
    memberSince: "2019",
    specialties: ["Oil Painting", "Landscape", "Urban Art"],
    achievements: ["Featured Artist at SF Gallery Week 2023", "Winner - Bay Area Art Competition 2022"],
    stats: {
      totalAuctions: 47,
      totalSales: 156000,
      avgSalePrice: 2340,
      followers: 1247
    },
    social: {
      website: "mariaart.com",
      instagram: "@maria_paints"
    }
  };

  // Mock auctions data
  const activeAuctions = [
    {
      id: "1",
      title: "Sunset Over Silicon Valley",
      artist: artist.name,
      currentBid: 2450,
      timeRemaining: "2h 45m",
      image: artwork1,
      status: "live" as const,
      location: "San Francisco, CA",
      distance: "2.3 miles"
    }
  ];

  const pastAuctions = [
    {
      id: "2",
      title: "Golden Gate Dreams",
      artist: artist.name,
      currentBid: 3200,
      timeRemaining: "Sold",
      image: artwork2,
      status: "ended" as const,
      location: "San Francisco, CA",
      distance: "2.3 miles"
    },
    {
      id: "3",
      title: "Morning in Noe Valley",
      artist: artist.name,
      currentBid: 1890,
      timeRemaining: "Sold",
      image: artwork3,
      status: "ended" as const,
      location: "San Francisco, CA",
      distance: "2.3 miles"
    }
  ];

  const portfolio = [
    {
      id: "p1",
      title: "Bay Bridge at Twilight",
      image: artwork1,
      year: "2024",
      medium: "Oil on Canvas",
      sold: false,
      price: 2800
    },
    {
      id: "p2",
      title: "Castro Street Festival",
      image: artwork2,
      year: "2023",
      medium: "Oil on Canvas",
      sold: true,
      price: 3200
    },
    {
      id: "p3",
      title: "Presidio Morning",
      image: artwork3,
      year: "2024",
      medium: "Oil on Canvas",
      sold: false,
      price: 2100
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <div className="container mx-auto px-4 py-8">
        {/* Artist Header */}
        <div className="flex flex-col md:flex-row gap-8 mb-8">
          <div className="flex-shrink-0">
            <img 
              src={artist.profileImage} 
              alt={artist.name}
              className="w-32 h-32 rounded-full object-cover border-4 border-accent"
            />
          </div>
          
          <div className="flex-1">
            <div className="flex flex-col md:flex-row md:items-start md:justify-between">
              <div>
                <h1 className="font-playfair text-3xl font-bold mb-2">{artist.name}</h1>
                <div className="flex items-center text-muted-foreground mb-3">
                  <MapPin className="w-4 h-4 mr-1" />
                  {artist.location}
                </div>
                <div className="flex items-center text-muted-foreground mb-4">
                  <Calendar className="w-4 h-4 mr-1" />
                  Member since {artist.memberSince}
                </div>
                <div className="flex flex-wrap gap-2 mb-4">
                  {artist.specialties.map((specialty) => (
                    <Badge key={specialty} variant="secondary">{specialty}</Badge>
                  ))}
                </div>
              </div>
              
              <div className="flex space-x-2">
                <Button variant="outline">
                  <Heart className="w-4 h-4 mr-2" />
                  Follow ({artist.stats.followers})
                </Button>
                <Button variant="outline">
                  <Share2 className="w-4 h-4 mr-2" />
                  Share
                </Button>
                <Button className="btn-primary">
                  Message Artist
                </Button>
              </div>
            </div>
            
            <p className="text-muted-foreground mt-4">{artist.bio}</p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-accent">{artist.stats.totalAuctions}</p>
              <p className="text-sm text-muted-foreground">Total Auctions</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-accent">${artist.stats.totalSales.toLocaleString()}</p>
              <p className="text-sm text-muted-foreground">Total Sales</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-accent">${artist.stats.avgSalePrice.toLocaleString()}</p>
              <p className="text-sm text-muted-foreground">Avg. Sale Price</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-accent">{artist.stats.followers}</p>
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
            <h2 className="font-playfair text-2xl font-bold">Active Auctions</h2>
            {activeAuctions.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {activeAuctions.map((auction) => (
                  <AuctionCard key={auction.id} {...auction} />
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="p-8 text-center">
                  <p className="text-muted-foreground">No active auctions at the moment.</p>
                  <Button className="mt-4">Follow for Updates</Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>
          
          <TabsContent value="portfolio" className="space-y-6">
            <h2 className="font-playfair text-2xl font-bold">Portfolio</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {portfolio.map((artwork) => (
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
                    <h3 className="font-semibold">{artwork.title}</h3>
                    <p className="text-sm text-muted-foreground">{artwork.year} • {artwork.medium}</p>
                    <p className="text-lg font-bold text-accent mt-2">${artwork.price.toLocaleString()}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
          
          <TabsContent value="sold" className="space-y-6">
            <h2 className="font-playfair text-2xl font-bold">Recently Sold</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {pastAuctions.map((auction) => (
                <AuctionCard key={auction.id} {...auction} />
              ))}
            </div>
          </TabsContent>
          
          <TabsContent value="about" className="space-y-6">
            <h2 className="font-playfair text-2xl font-bold">About the Artist</h2>
            <Card>
              <CardContent className="p-6 space-y-6">
                <div>
                  <h3 className="font-semibold mb-2">Biography</h3>
                  <p className="text-muted-foreground">{artist.bio}</p>
                </div>
                
                <div>
                  <h3 className="font-semibold mb-2">Achievements</h3>
                  <ul className="space-y-1">
                    {artist.achievements.map((achievement, index) => (
                      <li key={index} className="flex items-center text-muted-foreground">
                        <Award className="w-4 h-4 mr-2 text-accent" />
                        {achievement}
                      </li>
                    ))}
                  </ul>
                </div>
                
                <div>
                  <h3 className="font-semibold mb-2">Connect</h3>
                  <div className="space-y-2">
                    <p className="text-muted-foreground">Website: {artist.social.website}</p>
                    <p className="text-muted-foreground">Instagram: {artist.social.instagram}</p>
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

