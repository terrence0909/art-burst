import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getCurrentUser, fetchUserAttributes, signOut } from "aws-amplify/auth";
import { User, Heart, Gavel, Plus, Settings, TrendingUp, Clock, DollarSign, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { AuctionCard } from "@/components/AuctionCard";

// Image imports with TypeScript support
const artwork1 = "/images/artwork-1.jpeg";
const artwork2 = "/images/artwork-2.jpeg";
const artwork3 = "/images/artwork-3.jpeg";

interface Auction {
  id: string;
  title: string;
  artist: string;
  currentBid: number;
  myBid?: number;
  timeRemaining: string;
  image: string;
  status: "live" | "upcoming" | "ended";
  location: string;
  distance: string;
  isWinning?: boolean;
}

interface Activity {
  type: "bid" | "watch" | "win";
  item: string;
  amount?: number;
  time: string;
  status?: "outbid" | "won" | "active";
}

interface UserData {
  name: string;
  email: string;
  profileImage: string;
  memberSince: string;
  stats: {
    activeBids: number;
    watchedItems: number;
    totalSpent: number;
    itemsWon: number;
  };
}

const Dashboard = () => {
  const [activeTab, setActiveTab] = useState("overview");
  const [user, setUser] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  // Mock data
  const [activeBids, setActiveBids] = useState<Auction[]>([
    {
      id: "1",
      title: "Sunset Over Silicon Valley",
      artist: "Maria Rodriguez",
      currentBid: 2450,
      myBid: 2400,
      timeRemaining: "2h 45m",
      image: artwork1,
      status: "live",
      location: "San Francisco, CA",
      distance: "2.3 miles",
      isWinning: false
    }
  ]);

  const [watchedItems, setWatchedItems] = useState<Auction[]>([
    {
      id: "2",
      title: "Urban Dreams",
      artist: "James Chen",
      currentBid: 1200,
      timeRemaining: "1d 12h",
      image: artwork2,
      status: "upcoming",
      location: "Oakland, CA",
      distance: "8.1 miles"
    }
  ]);

  const [recentActivity, setRecentActivity] = useState<Activity[]>([
    { type: "bid", item: "Abstract Cityscape", amount: 1800, time: "2 hours ago", status: "outbid" }
  ]);

  // Fetch user data with Amplify v6
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const { username } = await getCurrentUser();
        const attributes = await fetchUserAttributes();
        
        setUser({
          name: `${attributes.given_name || 'User'} ${attributes.family_name || ''}`.trim(),
          email: attributes.email || username,
          profileImage: attributes.picture || "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&h=400&fit=crop&crop=face",
          memberSince: new Date().getFullYear().toString(),
          stats: {
            activeBids: activeBids.length,
            watchedItems: watchedItems.length,
            totalSpent: 24500,
            itemsWon: 8
          }
        });
      } catch (err) {
        setError("You need to sign in to access this page");
        navigate("/signin");
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, []);

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate("/signin");
    } catch (err) {
      setError("Failed to sign out. Please try again.");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-accent"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-red-500">{error || "User data not available"}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <div className="container mx-auto px-4 py-8">
        {/* Welcome Header */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8 gap-4">
          <div className="flex items-center space-x-4">
            <img 
              src={user.profileImage} 
              alt={user.name}
              className="w-16 h-16 rounded-full object-cover border-2 border-accent"
            />
            <div>
              <h1 className="font-playfair text-2xl font-bold">Welcome back, {user.name.split(" ")[0]}!</h1>
              <p className="text-muted-foreground">Member since {user.memberSince}</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={handleSignOut}>
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </Button>
            <Button variant="outline">
              <Settings className="w-4 h-4 mr-2" />
              Account Settings
            </Button>
          </div>
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
          <TabsList className="grid w-full grid-cols-2 md:grid-cols-5">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="bids">My Bids</TabsTrigger>
            <TabsTrigger value="watching">Watching</TabsTrigger>
            <TabsTrigger value="collection">Collection</TabsTrigger>
            <TabsTrigger value="activity">Activity</TabsTrigger>
          </TabsList>
          
          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
                        <AuctionCard key={auction.id} {...auction} />
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <p className="text-muted-foreground mb-4">No active bids</p>
                      <Button>
                        <Plus className="w-4 h-4 mr-2" />
                        Browse Auctions
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>

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
                      <div key={index} className="flex items-center justify-between p-2 hover:bg-muted/50 rounded-lg transition-colors">
                        <div className="flex items-center space-x-3">
                          <div className={`w-2 h-2 rounded-full ${
                            activity.type === 'win' ? 'bg-green-500' :
                            activity.status === 'outbid' ? 'bg-red-500' :
                            'bg-blue-500'
                          }`} />
                          <div>
                            <p className="text-sm font-medium">
                              {activity.type === 'bid' ? 'Bid placed' :
                               activity.type === 'win' ? 'Auction won' :
                               'Item watched'} on {activity.item}
                            </p>
                            {activity.amount && (
                              <p className="text-xs text-muted-foreground">${activity.amount.toLocaleString()}</p>
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

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center">
                    <Heart className="w-5 h-5 mr-2" />
                    Recently Watched
                  </span>
                  <Button variant="ghost" size="sm">View All</Button>
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

          {/* Other Tabs */}
          <TabsContent value="bids" className="space-y-6">
            {/* Bids content */}
          </TabsContent>
          
          <TabsContent value="watching" className="space-y-6">
            {/* Watching content */}
          </TabsContent>
          
          <TabsContent value="collection" className="space-y-6">
            <Card>
              <CardContent className="text-center py-12">
                <User className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-xl font-semibold mb-2">Your collection is empty</h3>
                <p className="text-muted-foreground mb-6">
                  Items you win will appear here
                </p>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Browse Auctions
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="activity" className="space-y-6">
            {/* Activity content */}
          </TabsContent>
        </Tabs>
      </div>

      <Footer />
    </div>
  );
};

export default Dashboard;