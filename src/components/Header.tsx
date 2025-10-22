import { MapPin, User, Search, Bell, LogOut, Home, Gavel, Menu, Plus, Loader2, Settings, CheckCircle, XCircle, AlertCircle, Trophy, CreditCard } from "lucide-react";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet";
import FULL_LOGO from '@/assets/FULL-LOGO.png';

// Add your OpenCage API key here
const OPENCAGE_API_KEY = import.meta.env.VITE_OPENCAGE_API_KEY;

interface LocationData {
  city: string;
  province: string;
  country: string;
  coordinates: {
    lat: number;
    lng: number;
  };
}

interface Notification {
  id: string;
  type: 'OUTBID' | 'AUCTION_ENDING' | 'AUCTION_WON' | 'NEW_BID' | 'BID_CONFIRMED' | 'PAYMENT_REMINDER' | 'AUCTION_SOLD';
  title: string;
  message: string;
  userId: string;
  relatedId?: string;
  read: boolean;
  createdAt: string;
  metadata?: any;
}

export const Header = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchTerm, setSearchTerm] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userName, setUserName] = useState("");
  const [userProfileImage, setUserProfileImage] = useState("");
  const [loading, setLoading] = useState(true);
  
  // Location state
  const [currentLocation, setCurrentLocation] = useState<LocationData | null>(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [locationDialogOpen, setLocationDialogOpen] = useState(false);
  const [customLocationSearch, setCustomLocationSearch] = useState("");

  // Mobile menu state
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Notification state
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<Notification[]>([]);

  // Logo state
  const [logoError, setLogoError] = useState(false);

  const handleLogoError = () => {
    console.error('Logo failed to load');
    setLogoError(true);
  };

  useEffect(() => {
    checkAuthStatus();
    loadSavedLocation();
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      checkUnreadNotifications();
      
      // Set up real-time notification subscription
      const setupRealTimeNotifications = async () => {
        try {
          const service = await import('@/services/notificationService').then(m => m.notificationService);
          const userId = localStorage.getItem('auction-user-id');
          if (userId) {
            // Subscribe to real-time notifications for this user
            const unsubscribe = service.subscribe(userId, (newNotification) => {
              // Update badge count in real-time when new notification arrives
              setUnreadCount(prev => prev + 1);
              setNotifications(prev => [newNotification, ...prev]);
            });
            
            return unsubscribe;
          }
        } catch (error) {
          console.error('Error setting up real-time notifications:', error);
        }
      };

      const cleanup = setupRealTimeNotifications();
      return () => {
        cleanup.then(unsubscribe => unsubscribe && unsubscribe());
      };
    }
  }, [isAuthenticated]);

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

  const checkUnreadNotifications = async () => {
    try {
      const service = await import('@/services/notificationService').then(m => m.notificationService);
      const userId = localStorage.getItem('auction-user-id');
      if (userId) {
        const userNotifications = service.getUserNotifications(userId);
        const unread = userNotifications.filter(n => !n.read).length;
        setUnreadCount(unread);
        setNotifications(userNotifications.slice(0, 10)); // Show latest 10 in dropdown
      }
    } catch (error) {
      console.error('Error checking notifications:', error);
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'OUTBID': return <XCircle className="w-4 h-4 text-destructive" />;
      case 'AUCTION_ENDING': return <AlertCircle className="w-4 h-4 text-yellow-500" />;
      case 'AUCTION_WON': return <Trophy className="w-4 h-4 text-green-500" />;
      case 'NEW_BID': return <Bell className="w-4 h-4 text-blue-500" />;
      case 'BID_CONFIRMED': return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'PAYMENT_REMINDER': return <CreditCard className="w-4 h-4 text-orange-500" />;
      case 'AUCTION_SOLD': return <Trophy className="w-4 h-4 text-green-500" />;
      default: return <Bell className="w-4 h-4 text-primary" />;
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      const service = await import('@/services/notificationService').then(m => m.notificationService);
      const userId = localStorage.getItem('auction-user-id');
      if (userId) {
        service.markAsRead(notificationId, userId);
        setUnreadCount(prev => Math.max(0, prev - 1));
        setNotifications(prev => prev.map(n => 
          n.id === notificationId ? { ...n, read: true } : n
        ));
      }
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      const service = await import('@/services/notificationService').then(m => m.notificationService);
      const userId = localStorage.getItem('auction-user-id');
      if (userId) {
        service.markAllAsRead(userId);
        setUnreadCount(0);
        setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      }
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };

  // Load saved location from localStorage
  const loadSavedLocation = () => {
    try {
      const saved = localStorage.getItem('artburst-user-location');
      if (saved) {
        const locationData = JSON.parse(saved);
        setCurrentLocation(locationData);
      } else {
        // Default to Bloemfontein if no saved location
        setCurrentLocation({
          city: "Bloemfontein",
          province: "Free State",
          country: "South Africa",
          coordinates: { lat: -29.1214, lng: 26.2142 }
        });
      }
    } catch (error) {
      console.error('Error loading saved location:', error);
    }
  };

  // Save location to localStorage
  const saveLocation = (locationData: LocationData) => {
    try {
      localStorage.setItem('artburst-user-location', JSON.stringify(locationData));
      setCurrentLocation(locationData);
    } catch (error) {
      console.error('Error saving location:', error);
    }
  };

  // Get user's current location using browser geolocation
  const getCurrentLocation = async () => {
    if (!navigator.geolocation) {
      setLocationError("Geolocation is not supported by your browser");
      return;
    }

    setLocationLoading(true);
    setLocationError(null);

    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          timeout: 10000,
          enableHighAccuracy: true
        });
      });

      const { latitude, longitude } = position.coords;
      
      // Reverse geocoding to get city name using OpenCage API
      const response = await fetch(
        `https://api.opencagedata.com/geocode/v1/json?q=${latitude}+${longitude}&key=${OPENCAGE_API_KEY}&language=en&limit=1`
      );
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.results && data.results.length > 0) {
        const result = data.results[0];
        
        const locationData: LocationData = {
          city: result.components.city || 
                result.components.town || 
                result.components.village || 
                result.components.suburb ||
                "Unknown Location",
          province: result.components.state || 
                   result.components.province || 
                   "",
          country: result.components.country || "",
          coordinates: { lat: latitude, lng: longitude }
        };
        
        saveLocation(locationData);
      } else {
        throw new Error('No location results found');
      }
    } catch (error: any) {
      console.error('Location error:', error);
      if (error.code === 1) {
        setLocationError("Location access denied. Please enable location access.");
      } else if (error.code === 2) {
        setLocationError("Location unavailable. Please try again.");
      } else if (error.code === 3) {
        setLocationError("Location request timed out. Please try again.");
      } else {
        setLocationError("Unable to get your location. Using default.");
      }
    } finally {
      setLocationLoading(false);
    }
  };

  // Search for a custom location
  const searchLocation = async (query: string) => {
    if (!query.trim()) return;
    
    setLocationLoading(true);
    setLocationError(null);

    try {
      // Using OpenCage Geocoding API
      const response = await fetch(
        `https://api.opencagedata.com/geocode/v1/json?q=${encodeURIComponent(query)}&key=${OPENCAGE_API_KEY}&countrycode=za&limit=5&language=en`
      );
      
      if (!response.ok) {
        throw new Error(`Search failed: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.results && data.results.length > 0) {
        const result = data.results[0]; // Get the best match
        
        const locationData: LocationData = {
          city: result.components.city || 
                result.components.town || 
                result.components.village ||
                result.components.suburb ||
                query,
          province: result.components.state || 
                   result.components.province || 
                   "",
          country: result.components.country || "South Africa",
          coordinates: { 
            lat: result.geometry.lat, 
            lng: result.geometry.lng 
          }
        };
        
        saveLocation(locationData);
        setLocationDialogOpen(false);
        setCustomLocationSearch("");
      } else {
        setLocationError("Location not found in South Africa. Please try a different search.");
      }
    } catch (error) {
      console.error('Location search error:', error);
      setLocationError("Unable to search location. Please try again.");
    } finally {
      setLocationLoading(false);
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
      const searchParams = new URLSearchParams();
      
      const isLocationSearch = /^[a-zA-Z\s,]+$/.test(searchTerm.trim());
      
      if (isLocationSearch) {
        searchParams.set('location', searchTerm.trim());
      } else {
        searchParams.set('query', searchTerm.trim());
      }
      
      if (currentLocation) {
        searchParams.set('currentLocation', currentLocation.city);
        searchParams.set('lat', currentLocation.coordinates.lat.toString());
        searchParams.set('lng', currentLocation.coordinates.lng.toString());
      }
      
      navigate(`/browse?${searchParams.toString()}`);
      setSearchTerm("");
      setMobileMenuOpen(false); // Close mobile menu after search
    }
  };

  if (loading) {
    return (
      <header className="sticky top-0 z-50 w-full border-b backdrop-blur-xl bg-white/20 border border-white/30 supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between px-4">
          <Link to="/" className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-luxury rounded-lg flex items-center justify-center">
              <span className="text-luxury-foreground font-bold text-sm">A</span>
            </div>
            <span className="font-playfair font-bold text-xl">ArtBurst</span>
          </Link>
          <div className="w-8 h-8 bg-muted rounded-full animate-pulse"></div>
        </div>
      </header>
    );
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b backdrop-blur-xl bg-white/20 border border-white/30 supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between px-4">
        {/* Logo - Always visible with fallback */}
        <Link to="/" className="flex items-center space-x-2 flex-shrink-0">
          {logoError ? (
            <div className="w-8 h-8 bg-gradient-luxury rounded-lg flex items-center justify-center">
              <span className="text-luxury-foreground font-bold text-sm">A</span>
            </div>
          ) : (
            <img 
              src={FULL_LOGO} 
              alt="ArtBurst" 
              className="h-[140px] w-auto object-contain -my-5"
              onError={handleLogoError}
            />
          )}
          <span className="font-playfair font-bold text-xl hidden sm:block">ArtBurst</span>
        </Link>

        {/* Search - Hidden on mobile, shown on tablet+ */}
        <div className="flex-1 max-w-md mx-4 hidden md:block">
          <form onSubmit={handleSearch} className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={`Search in ${currentLocation?.city || 'your area'}...`}
              className="pl-10 backdrop-blur-xl bg-white/20 border border-white/30"
            />
          </form>
        </div>

        {/* Right Side Actions */}
        <div className="flex items-center space-x-2 sm:space-x-3">
          {/* Mobile Search Button */}
          <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="md:hidden text-muted-foreground backdrop-blur-xl bg-white/20 border border-white/30"
              >
                <Search className="w-5 h-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="top" className="pt-16 backdrop-blur-xl bg-white/20 border border-white/30">
              <div className="space-y-4">
                <form onSubmit={handleSearch} className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5" />
                  <Input
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder={`Search in ${currentLocation?.city || 'your area'}...`}
                    className="pl-12 h-12 text-base backdrop-blur-xl bg-white/20 border border-white/30"
                    autoFocus
                  />
                </form>
                
                {/* Quick Location Display in Mobile Search */}
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <span>Searching near: {currentLocation?.city}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setLocationDialogOpen(true)}
                    className="h-auto p-0 text-primary hover:bg-transparent backdrop-blur-xl bg-white/20 border border-white/30"
                  >
                    Change
                  </Button>
                </div>
              </div>
            </SheetContent>
          </Sheet>

          {/* Location - Hidden on mobile, shown on tablet+ */}
          <Dialog open={locationDialogOpen} onOpenChange={setLocationDialogOpen}>
            <DialogTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="text-muted-foreground hidden md:flex hover:bg-accent backdrop-blur-xl bg-white/20 border border-white/30"
              >
                {locationLoading ? (
                  <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                ) : (
                  <MapPin className="w-4 h-4 mr-1" />
                )}
                <span className="hidden lg:inline">
                  {currentLocation?.city || "Set Location"}
                </span>
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md backdrop-blur-xl bg-white/20 border border-white/30">
              <DialogHeader>
                <DialogTitle>Set Your Location</DialogTitle>
                <DialogDescription>
                  Find auctions near you by setting your location
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                {currentLocation && (
                  <div className="p-3 rounded-lg backdrop-blur-xl bg-white/20 border border-white/30">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium">{currentLocation.city}</div>
                        <div className="text-sm text-muted-foreground">
                          {currentLocation.province}, {currentLocation.country}
                        </div>
                      </div>
                      <MapPin className="w-5 h-5 text-primary" />
                    </div>
                  </div>
                )}

                <Button
                  onClick={getCurrentLocation}
                  disabled={locationLoading}
                  className="w-full backdrop-blur-xl bg-white/20 border border-white/30"
                  variant="outline"
                >
                  {locationLoading ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <MapPin className="w-4 h-4 mr-2" />
                  )}
                  Use Current Location
                </Button>

                <div className="space-y-2">
                  <Input
                    value={customLocationSearch}
                    onChange={(e) => setCustomLocationSearch(e.target.value)}
                    placeholder="Search for a city..."
                    className="backdrop-blur-xl bg-white/20 border border-white/30"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        searchLocation(customLocationSearch);
                      }
                    }}
                  />
                  <Button
                    onClick={() => searchLocation(customLocationSearch)}
                    disabled={!customLocationSearch.trim() || locationLoading}
                    className="w-full backdrop-blur-xl bg-white/20 border border-white/30"
                  >
                    {locationLoading ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Search className="w-4 h-4 mr-2" />
                    )}
                    Search Location
                  </Button>
                </div>

                {locationError && (
                  <div className="p-3 rounded-lg backdrop-blur-xl bg-white/20 border border-white/30">
                    <p className="text-sm text-destructive">{locationError}</p>
                  </div>
                )}
              </div>
            </DialogContent>
          </Dialog>

          {/* Notifications Dropdown - Hidden on mobile, shown on tablet+ */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="text-muted-foreground hidden sm:flex backdrop-blur-xl bg-white/20 border border-white/30 relative"
              >
                <Bell className="w-4 h-4" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                    {unreadCount}
                  </span>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80 max-h-96 overflow-y-auto backdrop-blur-xl bg-white/20 border border-white/30">
              <div className="px-2 py-1.5 text-sm font-medium border-b flex items-center justify-between">
                <span>Notifications</span>
                {unreadCount > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-auto p-0 text-xs text-primary hover:bg-transparent"
                    onClick={markAllAsRead}
                  >
                    Mark all read
                  </Button>
                )}
              </div>
              
              {notifications.length === 0 ? (
                <div className="px-2 py-4 text-center text-muted-foreground">
                  <Bell className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No notifications yet</p>
                </div>
              ) : (
                <div className="max-h-64 overflow-y-auto">
                  {notifications.map((notification) => (
                    <div
                      key={notification.id}
                      className={`px-2 py-3 border-b last:border-b-0 ${
                        !notification.read ? 'bg-primary/5' : ''
                      }`}
                    >
                      <div className="flex items-start space-x-2">
                        <div className="mt-0.5">
                          {getNotificationIcon(notification.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2 mb-1">
                            <p className="text-sm font-medium text-foreground">
                              {notification.title}
                            </p>
                            {!notification.read && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0 hover:bg-primary/10"
                                onClick={() => markAsRead(notification.id)}
                              >
                                <CheckCircle className="w-3 h-3" />
                              </Button>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground mb-1">
                            {notification.message}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(notification.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              
              <div className="p-2 border-t">
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-center text-xs"
                  onClick={() => navigate('/notifications')}
                >
                  View all notifications
                </Button>
              </div>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* List Artwork - Hidden on mobile, shown on tablet+ */}
          <Link to="/create" className="hidden sm:block">
            <Button className="btn-primary backdrop-blur-xl bg-white/20 border border-white/30">
              List Artwork
            </Button>
          </Link>

          {/* User Profile Dropdown */}
          {isAuthenticated ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-full p-0 backdrop-blur-xl bg-white/20 border border-white/30">
                  <img
                    src={userProfileImage}
                    alt={userName}
                    className="w-8 h-8 rounded-full object-cover cursor-pointer hover:ring-2 hover:ring-accent transition-all"
                  />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48 backdrop-blur-xl bg-white/20 border border-white/30">
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
                  <Link to="/settings" className="cursor-pointer">
                    <Settings className="w-4 h-4 mr-2" />
                    Account Settings
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
              <Button variant="outline" size="sm" className="hidden sm:flex backdrop-blur-xl bg-white/20 border border-white/30">
                <User className="w-4 h-4 mr-1" />
                Sign In
              </Button>
              <Button size="icon" variant="outline" className="sm:hidden backdrop-blur-xl bg-white/20 border border-white/30">
                <User className="w-4 h-4" />
              </Button>
            </Link>
          )}

          {/* Mobile Menu for additional actions */}
          <Sheet>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="md:hidden text-muted-foreground backdrop-blur-xl bg-white/20 border border-white/30"
              >
                <Menu className="w-5 h-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-64 backdrop-blur-xl bg-white/20 border border-white/30">
              <div className="flex flex-col h-full">
                {/* User Info */}
                {isAuthenticated && (
                  <div className="flex items-center space-x-3 p-4 border-b">
                    <img
                      src={userProfileImage}
                      alt={userName}
                      className="w-10 h-10 rounded-full object-cover"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{userName}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {currentLocation?.city}
                      </p>
                    </div>
                  </div>
                )}

                {/* Mobile Navigation */}
                <nav className="flex-1 space-y-2 p-4">
                  <Button
                    variant="ghost"
                    className="w-full justify-start backdrop-blur-xl bg-white/20 border border-white/30"
                    onClick={() => {
                      navigate('/');
                      setMobileMenuOpen(false);
                    }}
                  >
                    <Home className="w-4 h-4 mr-3" />
                    Home
                  </Button>
                  
                  {isAuthenticated && (
                    <>
                      <Button
                        variant="ghost"
                        className="w-full justify-start backdrop-blur-xl bg-white/20 border border-white/30"
                        onClick={() => {
                          navigate('/dashboard');
                          setMobileMenuOpen(false);
                        }}
                      >
                        <User className="w-4 h-4 mr-3" />
                        Dashboard
                      </Button>
                      <Button
                        variant="ghost"
                        className="w-full justify-start backdrop-blur-xl bg-white/20 border border-white/30"
                        onClick={() => {
                          navigate('/auctions');
                          setMobileMenuOpen(false);
                        }}
                      >
                        <Gavel className="w-4 h-4 mr-3" />
                        My Bids
                      </Button>
                      <Button
                        variant="ghost"
                        className="w-full justify-start backdrop-blur-xl bg-white/20 border border-white/30"
                        onClick={() => {
                          navigate('/settings');
                          setMobileMenuOpen(false);
                        }}
                      >
                        <Settings className="w-4 h-4 mr-3" />
                        Account Settings
                      </Button>
                      <Button
                        variant="ghost"
                        className="w-full justify-start backdrop-blur-xl bg-white/20 border border-white/30"
                        onClick={() => {
                          navigate('/notifications');
                          setMobileMenuOpen(false);
                        }}
                      >
                        <Bell className="w-4 h-4 mr-3" />
                        Notifications
                        {unreadCount > 0 && (
                          <span className="ml-auto bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                            {unreadCount}
                          </span>
                        )}
                      </Button>
                    </>
                  )}
                </nav>

                {/* Bottom Actions */}
                <div className="p-4 space-y-3 border-t">
                  {!isAuthenticated && (
                    <Button
                      className="w-full backdrop-blur-xl bg-white/20 border border-white/30"
                      onClick={() => {
                        navigate('/auth');
                        setMobileMenuOpen(false);
                      }}
                    >
                      <User className="w-4 h-4 mr-2" />
                      Sign In
                    </Button>
                  )}
                  
                  <Button
                    className="w-full btn-primary backdrop-blur-xl bg-white/20 border border-white/30"
                    onClick={() => {
                      navigate('/create');
                      setMobileMenuOpen(false);
                    }}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    List Artwork
                  </Button>

                  {isAuthenticated && (
                    <Button
                      variant="outline"
                      className="w-full text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700 backdrop-blur-xl bg-white/20 border border-white/30"
                      onClick={() => {
                        handleSignOut();
                        setMobileMenuOpen(false);
                      }}
                    >
                      <LogOut className="w-4 h-4 mr-2" />
                      Sign Out
                    </Button>
                  )}
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
};