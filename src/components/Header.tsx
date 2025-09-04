import { MapPin, User, Search, Bell, LogOut } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Link, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { getCurrentUser, signOut, fetchUserAttributes } from "aws-amplify/auth";

export const Header = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userName, setUserName] = useState("");
  const [userProfileImage, setUserProfileImage] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const user = await getCurrentUser();
      setIsAuthenticated(true);
      
      // Try to get user attributes
      try {
        const attributes = await fetchUserAttributes();
        setUserName(attributes.given_name || user.username);
        setUserProfileImage(
          attributes.picture || 
          "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&h=400&fit=crop&crop=face"
        );
      } catch (attrError) {
        // If we can't get attributes, use the username
        setUserName(user.username);
        setUserProfileImage(
          "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&h=400&fit=crop&crop=face"
        );
      }
    } catch (err) {
      setIsAuthenticated(false);
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      setIsAuthenticated(false);
      setUserName("");
      setUserProfileImage("");
      navigate("/"); // Redirect to home page after sign out
    } catch (err) {
      console.error("Error signing out:", err);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchTerm.trim()) {
      navigate(`/search?query=${encodeURIComponent(searchTerm)}`);
    }
  };

  if (loading) {
    return (
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between px-4">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-luxury rounded-lg flex items-center justify-center">
              <span className="text-luxury-foreground font-bold text-sm">A</span>
            </div>
            <span className="font-playfair font-bold text-xl">ArtBurst</span>
          </Link>

          {/* Search */}
          <div className="flex-1 max-w-md mx-8">
            <form onSubmit={handleSearch} className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search artwork, artists, or locations..."
                className="pl-10 bg-muted/50"
              />
            </form>
          </div>

          {/* Loading state for user actions */}
          <div className="flex items-center space-x-4">
            <div className="w-24 h-8 bg-muted rounded-md animate-pulse"></div>
          </div>
        </div>
      </header>
    );
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between px-4">
        {/* Logo */}
        <Link to="/" className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-gradient-luxury rounded-lg flex items-center justify-center">
            <span className="text-luxury-foreground font-bold text-sm">A</span>
          </div>
          <span className="font-playfair font-bold text-xl">ArtBurst</span>
        </Link>

        {/* Search */}
        <div className="flex-1 max-w-md mx-8">
          <form onSubmit={handleSearch} className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search artwork, artists, or locations..."
              className="pl-10 bg-muted/50"
            />
          </form>
        </div>

        {/* Location & Actions */}
        <div className="flex items-center space-x-4">
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground"
            onClick={() => alert("Location feature coming soon!")}
          >
            <MapPin className="w-4 h-4 mr-2" />
            Bloemfontein, SA
          </Button>

          <Button
            variant="ghost"
            size="icon"
            onClick={() => alert("Notifications coming soon!")}
          >
            <Bell className="w-4 h-4" />
          </Button>

          {isAuthenticated ? (
            <div className="flex items-center space-x-3">
              <img
                src={userProfileImage}
                alt={userName}
                className="w-8 h-8 rounded-full object-cover"
              />
              <span className="text-sm font-medium hidden sm:block">
                {userName.split(" ")[0]}
              </span>
              <Button variant="outline" size="sm" onClick={handleSignOut}>
                <LogOut className="w-4 h-4 mr-1" />
                Sign Out
              </Button>
            </div>
          ) : (
            <Link to="/auth">
              <Button variant="outline">
                <User className="w-4 h-4 mr-2" />
                Sign In
              </Button>
            </Link>
          )}

          <Link to="/create">
            <Button className="btn-primary">
              List Artwork
            </Button>
          </Link>
        </div>
      </div>
    </header>
  );
};