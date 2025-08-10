import { useState } from "react";
import { User, Heart, Gavel, Plus, Settings, TrendingUp, Clock, DollarSign } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { AuctionCard } from "@/components/AuctionCard";
import artwork1 from "@/assets/artwork-1.jpeg";
import artwork2 from "@/assets/artwork-2.jpeg";
import artwork3 from "@/assets/artwork-3.jpeg";

const Dashboard = () => {
  const [activeTab, setActiveTab] = useState("overview");

  // Mock user data
  const user = {
    name: "John Collector",
    email: "john@example.com",
    profileImage: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&h=400&fit=crop&crop=face",
    memberSince: "2022",
    stats: {
      activeBids: 3,
      watchedItems: 12,
      totalSpent: 24500,
      itemsWon: 8
    }
  };

  // Mock data
  const activeBids = [
    {
      id: "1",
      title: "Sunset Over Silicon Valley",
      artist: "Maria Rodriguez",
      currentBid: 2450,
      myBid: 2400,
      timeRemaining: "2h 45m",
      image: artwork1,
      status: "live" as const,
      location: "San Francisco, CA",
      distance: "2.3 miles",
      isWinning: false
    }
  ];

  const watchedItems = [
    {
      id: "2",
      title: "Urban Dreams",
      artist: "James Chen",
      currentBid: 1200,
      timeRemaining: "1d 12h",
      image: artwork2,
      status: "upcoming" as const,
      location: "Oakland, CA",
      distance: "8.1 miles"
    },
    {
      id: "3",
      title: "Coastal Memories",
      artist: "Sarah Kim",
      currentBid: 890,
      timeRemaining: "4h 20m",
      image: artwork3,
      status: "live" as const,
      location: "Sausalito, CA",
      distance: "12.5 miles"
    }
  ];

  const recentActivity = [
    { type: "bid", item: "Abstract Cityscape", amount: 1800, time: "2 hours ago", status: "outbid" },
    { type: "watch", item: "Sunset Over Silicon Valley", time: "1 day ago" },
    { type: "win", item: "Morning Coffee Study", amount: 650, time: "3 days ago", status: "won" },
    { type: "bid", item: "Coastal Memories", amount: 850, time: "1 week ago", status: "active" }
  ];

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <div className="container mx-auto px-4 py-8">
        {/* Welcome Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-4">
            <img 
              src={user.profileImage} 
              alt={user.name}
              className="w-16 h-16 rounded-full object-cover border-2 border-accent"
            />
            <div>
              <h1 className="font-playfair text-2xl font-bold">Welcome back, {user.name}!</h1>
              <p className="text-muted-foreground">Member since {user.memberSince}</p>
            </div>
          </div>
          <Button variant="outline">
            <Settings className="w-4 h-4 mr-2" />
            Account Settings
          </Button>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="p-4 text-center">
              <Gavel className="w-8 h-8 mx-auto mb-2 text-accent" />
              <p className="text-2xl font-bold">{user.stats.activeBids}</p>
              <p className="text-sm text-muted-foreground">Active Bids</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <Heart className="w-8 h-8 mx-auto mb-2 text-accent" />
              <p className="text-2xl font-bold">{user.stats.watchedItems}</p>
              <p className="text-sm text-muted-foreground">Watched Items</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <DollarSign className="w-8 h-8 mx-auto mb-2 text-accent" />
              <p className="text-2xl font-bold">${user.stats.totalSpent.toLocaleString()}</p>
              <p className="text-sm text-muted-foreground">Total Spent</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <TrendingUp className="w-8 h-8 mx-auto mb-2 text-accent" />
              <p className="text-2xl font-bold">{user.stats.itemsWon}</p>
              <p className="text-sm text-muted-foreground">Items Won</p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="bids">My Bids</TabsTrigger>
            <TabsTrigger value="watching">Watching</TabsTrigger>
            <TabsTrigger value="collection">Collection</TabsTrigger>
            <TabsTrigger value="activity">Activity</TabsTrigger>
          </TabsList>
          
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Active Bids */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Gavel className="w-5 h-5 mr-2" />
                    Active Bids
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {activeBids.length > 0 ? (
                    <div className="space-y-4">
                      {activeBids.map((auction) => (
                        <div key={auction.id} className="flex items-center space-x-3 p-3 bg-muted/50 rounded-lg">
                          <img 
                            src={auction.image} 
                            alt={auction.title}
                            className="w-16 h-16 object-cover rounded-md"
                          />
                          <div className="flex-1">
                            <h4 className="font-semibold">{auction.title}</h4>
                            <p className="text-sm text-muted-foreground">by {auction.artist}</p>
                            <div className="flex items-center justify-between mt-1">
                              <span className="text-sm">
                                Your bid: <span className="font-semibold">${auction.myBid}</span>
                              </span>
                              <Badge variant={auction.isWinning ? "default" : "destructive"}>
                                {auction.isWinning ? "Winning" : "Outbid"}
                              </Badge>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground text-center py-4">No active bids</p>
                  )}
                </CardContent>
              </Card>

              {/* Recent Activity */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Clock className="w-5 h-5 mr-2" />
                    Recent Activity
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {recentActivity.map((activity, index) => (
                      <div key={index} className="flex items-center justify-between p-2">
                        <div className="flex items-center space-x-3">
                          <div className={`w-2 h-2 rounded-full ${
                            activity.type === 'win' ? 'bg-green-500' :
                            activity.type === 'bid' && activity.status === 'outbid' ? 'bg-red-500' :
                            'bg-blue-500'
                          }`} />
                          <div>
                            <p className="text-sm font-medium">
                              {activity.type === 'bid' ? 'Bid placed' :
                               activity.type === 'win' ? 'Auction won' :
                               'Item watched'} on {activity.item}
                            </p>
                            {activity.amount && (
                              <p className="text-sm text-muted-foreground">${activity.amount}</p>
                            )}
                          </div>
                        </div>
                        <span className="text-xs text-muted-foreground">{activity.time}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Watched Items Preview */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center">
                    <Heart className="w-5 h-5 mr-2" />
                    Watched Items
                  </span>
                  <Button variant="outline" size="sm">View All</Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {watchedItems.slice(0, 2).map((auction) => (
                    <AuctionCard key={auction.id} {...auction} />
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="bids" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="font-playfair text-2xl font-bold">My Bids</h2>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Browse Auctions
              </Button>
            </div>
            {activeBids.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {activeBids.map((auction) => (
                  <AuctionCard key={auction.id} {...auction} />
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="p-8 text-center">
                  <p className="text-muted-foreground">You haven't placed any bids yet.</p>
                  <Button className="mt-4">
                    <Plus className="w-4 h-4 mr-2" />
                    Start Bidding
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>
          
          <TabsContent value="watching" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="font-playfair text-2xl font-bold">Watched Items</h2>
              <Button variant="outline">
                <Settings className="w-4 h-4 mr-2" />
                Notification Settings
              </Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {watchedItems.map((auction) => (
                <AuctionCard key={auction.id} {...auction} />
              ))}
            </div>
          </TabsContent>
          
          <TabsContent value="collection" className="space-y-6">
            <h2 className="font-playfair text-2xl font-bold">My Collection</h2>
            <Card>
              <CardContent className="p-8 text-center">
                <p className="text-muted-foreground">Your collection will appear here once you win your first auction.</p>
                <Button className="mt-4">
                  <Plus className="w-4 h-4 mr-2" />
                  Browse Auctions
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="activity" className="space-y-6">
            <h2 className="font-playfair text-2xl font-bold">Activity History</h2>
            <Card>
              <CardContent className="p-6">
                <div className="space-y-4">
                  {recentActivity.map((activity, index) => (
                    <div key={index} className="flex items-center justify-between border-b pb-4">
                      <div className="flex items-center space-x-4">
                        <div className={`w-3 h-3 rounded-full ${
                          activity.type === 'win' ? 'bg-green-500' :
                          activity.type === 'bid' && activity.status === 'outbid' ? 'bg-red-500' :
                          'bg-blue-500'
                        }`} />
                        <div>
                          <p className="font-medium">
                            {activity.type === 'bid' ? 'Bid placed' :
                             activity.type === 'win' ? 'Auction won' :
                             'Item watched'} on {activity.item}
                          </p>
                          {activity.amount && (
                            <p className="text-sm text-muted-foreground">${activity.amount}</p>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-sm text-muted-foreground">{activity.time}</span>
                        {activity.status && (
                          <Badge className="ml-2" variant={
                            activity.status === 'won' ? 'default' :
                            activity.status === 'outbid' ? 'destructive' :
                            'secondary'
                          }>
                            {activity.status}
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
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

export default Dashboard;