import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getCurrentUser, fetchUserAttributes } from "aws-amplify/auth";
import {
  User,
  Heart,
  Gavel,
  Plus,
  TrendingUp,
  Clock,
  DollarSign,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { AuctionCard } from "@/components/AuctionCard";

// Image fallback
const artworkFallback = "/assets/artwork-1.jpeg";

interface Bid {
  bidId: string;
  auctionId: string;
  bidAmount: number;
  bidTime: string;
  userId: string;
  itemType: string;
  createdAt?: string;
  updatedAt?: string;
}

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

// Update this to your API Gateway endpoint
const API_BASE = "/api";

const Dashboard = () => {
  const [user, setUser] = useState<UserData | null>(null);
  const [activeBids, setActiveBids] = useState<Bid[]>([]);
  const [watchedItems, setWatchedItems] = useState<Auction[]>([]);
  const [recentActivity, setRecentActivity] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        // Get user info
        const { username: userId } = await getCurrentUser();
        const attributes = await fetchUserAttributes();

        setUser({
          name: `${attributes.given_name || "User"} ${attributes.family_name || ""}`.trim(),
          email: attributes.email || userId,
          profileImage:
            attributes.picture ||
            "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&h=400&fit=crop&crop=face",
          memberSince: new Date().getFullYear().toString(),
          stats: {
            activeBids: 0,
            watchedItems: 0,
            totalSpent: 0,
            itemsWon: 0,
          },
        });

        // Fetch active bids from Lambda
        const bidsRes = await fetch(`${API_BASE}/auctions/my-bids?userId=${userId}`);
        if (!bidsRes.ok) {
          const errorText = await bidsRes.text();
          console.error('Bids API error:', bidsRes.status, errorText);
          throw new Error(`Failed to fetch active bids: ${bidsRes.status}`);
        }
        
        const bidsData = await bidsRes.json();
        console.log('Bids API response:', bidsData);

        // Parse bid data
        const parsedBids = bidsData.body ? JSON.parse(bidsData.body) : bidsData;
        const bidsArray = Array.isArray(parsedBids) ? parsedBids : [];
        setActiveBids(bidsArray);

        // Mock watched items data
        setWatchedItems([
          {
            id: "1",
            title: "Coastal Dreams",
            artist: "Marina Waters",
            currentBid: 1200,
            timeRemaining: "2 days",
            image: artworkFallback,
            status: "live",
            location: "Cape Town",
            distance: "15 km"
          },
          {
            id: "2", 
            title: "Abstract Cityscape",
            artist: "Alex Turner",
            currentBid: 1800,
            timeRemaining: "1 day",
            image: artworkFallback,
            status: "live",
            location: "Johannesburg",
            distance: "50 km"
          }
        ]);

        // Mock recent activity
        setRecentActivity([
          { type: "bid", item: "Abstract Cityscape", amount: 1800, time: "2 hours ago", status: "outbid" },
          { type: "watch", item: "Coastal Dreams", time: "5 hours ago" },
          { type: "win", item: "Vintage Portrait", amount: 2200, time: "1 day ago", status: "won" },
          { type: "bid", item: "Modern Abstract", amount: 1500, time: "2 days ago", status: "active" },
        ]);

        // Update user stats
        setUser((prev) =>
          prev
            ? {
                ...prev,
                stats: {
                  ...prev.stats,
                  activeBids: bidsArray.length,
                  watchedItems: 2, // Mock watched items count
                  totalSpent: bidsArray.reduce((sum: number, bid: Bid) => sum + (bid.bidAmount || 0), 0),
                  itemsWon: 3, // Mock items won count
                },
              }
            : prev
        );
      } catch (err: any) {
        console.error('Dashboard error:', err);
        setError(err.message || "Failed to load dashboard data");
      } finally {
        setLoading(false);
      }
    };

    fetchDashboard();
  }, [navigate]);

  // Format date for display
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-ZA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-accent"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <p className="text-red-500 mb-4">{error || "User data not available"}</p>
          <Button onClick={() => navigate("/auth")}>Go to Sign In</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container mx-auto px-4 py-8">
        {/* Welcome & Stats */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8 gap-4">
          <div className="flex items-center space-x-4">
            <img
              src={user.profileImage}
              alt={user.name}
              className="w-16 h-16 rounded-full object-cover border-2 border-accent"
            />
            <div>
              <h1 className="font-playfair text-2xl font-bold">
                Welcome back, {user.name.split(" ")[0]}!
              </h1>
              <p className="text-muted-foreground">Member since {user.memberSince}</p>
            </div>
          </div>
          {/* Removed Account Settings button from here */}
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
              <p className="text-2xl font-bold">
                R {user.stats.totalSpent.toLocaleString()}
              </p>
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

        {/* Tabs */}
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 md:grid-cols-5">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="bids">My Bids</TabsTrigger>
            <TabsTrigger value="watching">Watching</TabsTrigger>
            <TabsTrigger value="collection">Collection</TabsTrigger>
            <TabsTrigger value="activity">Activity</TabsTrigger>
          </TabsList>

          {/* Overview */}
          <TabsContent value="overview" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Gavel className="w-5 h-5 mr-2" /> Active Bids
                </CardTitle>
              </CardHeader>
              <CardContent>
                {activeBids.length > 0 ? (
                  <div className="space-y-4">
                    {activeBids.map((bid) => (
                      <Card key={bid.bidId}>
                        <CardContent className="p-4">
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <h4 className="font-semibold text-lg">Auction: {bid.auctionId.substring(0, 8)}...</h4>
                              <p className="text-sm text-muted-foreground mb-2">Bid ID: {bid.bidId.substring(0, 8)}...</p>
                              <div className="flex items-center space-x-4 text-sm">
                                <div className="flex items-center">
                                  <DollarSign className="w-4 h-4 mr-1 text-accent" />
                                  <span className="font-medium">R {bid.bidAmount}</span>
                                </div>
                                <div className="flex items-center">
                                  <Clock className="w-4 h-4 mr-1 text-muted-foreground" />
                                  <span>{formatDate(bid.bidTime)}</span>
                                </div>
                              </div>
                            </div>
                            <div className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium">
                              Active
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground mb-4">No active bids</p>
                    <Button onClick={() => navigate("/auctions")}>
                      <Plus className="w-4 h-4 mr-2" /> Browse Auctions
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Heart className="w-5 h-5 mr-2" /> Recently Watched
                </CardTitle>
              </CardHeader>
              <CardContent>
                {watchedItems.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {watchedItems.map((auction) => (
                      <AuctionCard key={auction.id} {...auction} />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground mb-4">No watched items</p>
                    <Button onClick={() => navigate("/auctions")}>
                      <Plus className="w-4 h-4 mr-2" /> Browse Auctions
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* My Bids */}
          <TabsContent value="bids" className="space-y-6">
            {activeBids.length > 0 ? (
              activeBids.map((bid) => (
                <Card key={bid.bidId}>
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h4 className="font-semibold text-lg">Auction: {bid.auctionId}</h4>
                        <p className="text-sm text-muted-foreground mb-2">Bid ID: {bid.bidId}</p>
                        <div className="flex items-center space-x-4 text-sm">
                          <div className="flex items-center">
                            <DollarSign className="w-4 h-4 mr-1 text-accent" />
                            <span className="font-medium">R {bid.bidAmount}</span>
                          </div>
                          <div className="flex items-center">
                            <Clock className="w-4 h-4 mr-1 text-muted-foreground" />
                            <span>{formatDate(bid.bidTime)}</span>
                          </div>
                        </div>
                      </div>
                      <div className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium">
                        Active
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <div className="text-center py-8">
                <p className="text-muted-foreground mb-4">No active bids</p>
                <Button onClick={() => navigate("/auctions")}>
                  <Plus className="w-4 h-4 mr-2" /> Browse Auctions
                </Button>
              </div>
            )}
          </TabsContent>

          {/* Watching */}
          <TabsContent value="watching" className="space-y-6">
            {watchedItems.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {watchedItems.map((auction) => (
                  <AuctionCard key={auction.id} {...auction} />
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-muted-foreground mb-4">No watched items</p>
                <Button onClick={() => navigate("/auctions")}>
                  <Plus className="w-4 h-4 mr-2" /> Browse Auctions
                </Button>
              </div>
            )}
          </TabsContent>

          {/* Collection */}
          <TabsContent value="collection" className="space-y-6">
            <Card>
              <CardContent className="text-center py-12">
                <User className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-xl font-semibold mb-2">Your collection is empty</h3>
                <p className="text-muted-foreground mb-6">
                  Items you win will appear here
                </p>
                <Button onClick={() => navigate("/auctions")}>
                  <Plus className="w-4 h-4 mr-2" /> Browse Auctions
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Activity */}
          <TabsContent value="activity" className="space-y-6">
            <div className="space-y-3">
              {recentActivity.map((activity, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-3 hover:bg-muted/50 rounded-lg transition-colors"
                >
                  <div className="flex items-center space-x-3">
                    <div
                      className={`w-2 h-2 rounded-full ${
                        activity.type === "win"
                          ? "bg-green-500"
                          : activity.status === "outbid"
                          ? "bg-red-500"
                          : "bg-blue-500"
                      }`}
                    />
                    <div>
                      <p className="text-sm font-medium">
                        {activity.type === "bid"
                          ? "Bid placed"
                          : activity.type === "win"
                          ? "Auction won"
                          : "Item watched"}{" "}
                        on {activity.item}
                      </p>
                      {activity.amount && (
                        <p className="text-xs text-muted-foreground">
                          R {activity.amount.toLocaleString()}
                        </p>
                      )}
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground">{activity.time}</span>
                </div>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>
      <Footer />
    </div>
  );
};

export default Dashboard;