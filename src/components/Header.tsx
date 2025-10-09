import { MapPin, User, Search, Bell, LogOut, Home, Gavel, Menu, Plus, Loader2, Settings } from "lucide-react";
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

  useEffect(() => {
    checkAuthStatus();
    loadSavedLocation();
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

  // Fixed search function to properly handle location searches
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchTerm.trim()) {
      // Navigate to Browse page with search parameters
      const searchParams = new URLSearchParams();
      
      // Check if the search term looks like a location (city name)
      const isLocationSearch = /^[a-zA-Z\s,]+$/.test(searchTerm.trim());
      
      if (isLocationSearch) {
        // If it looks like a location, search by location
        searchParams.set('location', searchTerm.trim());
      } else {
        // Otherwise, search by text query
        searchParams.set('query', searchTerm.trim());
      }
      
      // Always include current location for context
      if (currentLocation) {
        searchParams.set('currentLocation', currentLocation.city);
        searchParams.set('lat', currentLocation.coordinates.lat.toString());
        searchParams.set('lng', currentLocation.coordinates.lng.toString());
      }
      
      navigate(`/browse?${searchParams.toString()}`);
      setSearchTerm(""); // Clear the search input
      
      console.log('🔍 Header Search:', {
        searchTerm: searchTerm.trim(),
        isLocationSearch,
        params: Object.fromEntries(searchParams)
      });
    }
  };

  if (loading) {
    return (
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between px-4">
          <Link to="/" className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-luxury rounded-lg flex items-center justify-center">
              <span className="text-luxury-foreground font-bold text-sm">A</span>
            </div>
            <span className="font-playfair font-bold text-xl">ArtBurst</span>
          </Link>
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
              placeholder={`Search in ${currentLocation?.city || 'your area'}...`}
              className="pl-10 bg-muted/50"
            />
          </form>
        </div>

        {/* Right Side Actions */}
        <div className="flex items-center space-x-3">
          {/* Location Selector */}
          <Dialog open={locationDialogOpen} onOpenChange={setLocationDialogOpen}>
            <DialogTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="text-muted-foreground hidden md:flex hover:bg-accent"
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
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Set Your Location</DialogTitle>
                <DialogDescription>
                  Find auctions near you by setting your location
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                {/* Current Location */}
                {currentLocation && (
                  <div className="p-3 bg-muted rounded-lg">
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

                {/* Use Current Location */}
                <Button
                  onClick={getCurrentLocation}
                  disabled={locationLoading}
                  className="w-full"
                  variant="outline"
                >
                  {locationLoading ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <MapPin className="w-4 h-4 mr-2" />
                  )}
                  Use Current Location
                </Button>

                {/* Search Location */}
                <div className="space-y-2">
                  <Input
                    value={customLocationSearch}
                    onChange={(e) => setCustomLocationSearch(e.target.value)}
                    placeholder="Search for a city..."
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
                    className="w-full"
                  >
                    {locationLoading ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Search className="w-4 h-4 mr-2" />
                    )}
                    Search Location
                  </Button>
                </div>

                {/* Error Display */}
                {locationError && (
                  <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                    <p className="text-sm text-destructive">{locationError}</p>
                  </div>
                )}
              </div>
            </DialogContent>
          </Dialog>

          {/* Notifications */}
          <Button
            variant="ghost"
            size="icon"
            className="text-muted-foreground"
            onClick={() => navigate('/notifications')}
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
              {/* UPDATED: Sign In button - text on desktop, icon on mobile */}
              <Button variant="outline" size="sm" className="hidden sm:flex">
                <User className="w-4 h-4 mr-1" />
                Sign In
              </Button>
              <Button size="icon" variant="outline" className="sm:hidden">
                <User className="w-4 h-4" />
              </Button>
            </Link>
          )}

          {/* List Artwork - UPDATED: Keep the responsive behavior */}
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