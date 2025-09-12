import { MapPin, User, Search, Bell, LogOut, Home, Gavel, Menu, Plus } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useState, useEffect } from "react";
import { getCurrentUser, signOut, fetchUserAttributes } from "aws-amplify/auth";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export const Header = () => {
  const navigate = useNavigate();
  const location = useLocation();
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
      
      try {
        const attributes = await fetchUserAttributes();
        setUserName(attributes.given_name || user.username);
        setUserProfileImage(
          attributes.picture || 
          "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&h=400&fit=crop&crop=face"
        );
      } catch (attrError) {
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
      navigate("/");
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

          {/* Loading state */}
          <div className="flex items-center space-x-4">
            <div className="w-8 h-8 bg-muted rounded-full animate-pulse"></div>
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

        {/* Search - Centered */}
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

        {/* Right Side Actions - Clean and Minimal */}
        <div className="flex items-center space-x-3">
          {/* Location - Hidden on mobile */}
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground hidden md:flex"
            onClick={() => alert("Location feature coming soon!")}
          >
            <MapPin className="w-4 h-4 mr-1" />
            <span className="hidden lg:inline">Bloemfontein</span>
          </Button>

          {/* Notifications */}
          <Button
            variant="ghost"
            size="icon"
            className="text-muted-foreground"
            onClick={() => alert("Notifications coming soon!")}
          >
            <Bell className="w-4 h-4" />
          </Button>

          {/* User Profile Dropdown */}
          {isAuthenticated ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-full p-0">
                  <img
                    src={userProfileImage}
                    alt={userName}
                    className="w-8 h-8 rounded-full object-cover cursor-pointer hover:ring-2 hover:ring-accent transition-all"
                  />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <div className="px-2 py-1.5 text-sm font-medium border-b">
                  {userName}
                </div>
                <DropdownMenuItem asChild>
                  <Link to="/dashboard" className="cursor-pointer">
                    <User className="w-4 h-4 mr-2" />
                    Dashboard
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/auctions" className="cursor-pointer">
                    <Gavel className="w-4 h-4 mr-2" />
                    My Bids
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/" className="cursor-pointer">
                    <Home className="w-4 h-4 mr-2" />
                    Home
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={handleSignOut}
                  className="cursor-pointer text-red-600 focus:text-red-600"
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Link to="/auth">
              <Button variant="outline" size="sm">
                <User className="w-4 h-4 mr-1" />
                Sign In
              </Button>
            </Link>
          )}

          {/* List Artwork - Prominent CTA */}
          <Link to="/create">
            <Button className="btn-primary hidden sm:flex">
              List Artwork
            </Button>
            <Button size="icon" className="btn-primary sm:hidden">
              <Plus className="w-4 h-4" />
            </Button>
          </Link>
        </div>
      </div>
    </header>
  );
};