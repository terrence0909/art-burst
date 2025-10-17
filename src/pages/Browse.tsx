// FIRST: Install Leaflet
// npm install leaflet react-leaflet
// npm install -D @types/leaflet

// SECOND: Add to your index.html or main layout:
// <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />

import { useState, useEffect, useMemo, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { Search, Filter, MapPin, Grid, List, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { AuctionCard } from "@/components/AuctionCard";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/components/ui/use-toast";
import { getCurrentUser, fetchAuthSession } from "aws-amplify/auth";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "https://wckv09j9eg.execute-api.us-east-1.amazonaws.com/prod";

interface Auction {
  id: string;
  title: string;
  artist: string;
  artistId?: string;
  currentBid: number;
  timeRemaining: string;
  image: string;
  status: "live" | "upcoming" | "ended" | "closed";
  location: string;
  distance: string;
  medium?: string;
  year?: string;
  bidders?: number;
  startDate?: string;
  endDate?: string;
  highestBidder?: string;
  coordinates?: {
    lat: number;
    lng: number;
    province: string;
  };
}

interface Filters {
  category: string;
  priceRange: string;
  distance: string;
  status: string;
  sortBy: string;
}

// South Africa coordinates for major cities
const SOUTH_AFRICA_CITIES = [
  { name: "Johannesburg", coordinates: { lat: -26.2041, lng: 28.0473, province: "Gauteng" } },
  { name: "Cape Town", coordinates: { lat: -33.9249, lng: 18.4241, province: "Western Cape" } },
  { name: "Durban", coordinates: { lat: -29.8587, lng: 31.0218, province: "KwaZulu-Natal" } },
  { name: "Pretoria", coordinates: { lat: -25.7479, lng: 28.2293, province: "Gauteng" } },
  { name: "Port Elizabeth", coordinates: { lat: -33.9608, lng: 25.6022, province: "Eastern Cape" } },
  { name: "Bloemfontein", coordinates: { lat: -29.0852, lng: 26.1596, province: "Free State" } },
  { name: "Potchefstroom", coordinates: { lat: -26.7145, lng: 27.0970, province: "North West" } },
  { name: "Emakhazeni", coordinates: { lat: -25.6419, lng: 30.4630, province: "Mpumalanga" } },
  { name: "Stellenbosch", coordinates: { lat: -33.9321, lng: 18.8602, province: "Western Cape" } },
  { name: "Polokwane", coordinates: { lat: -23.9045, lng: 29.4689, province: "Limpopo" } }
];

const generateCoordinates = (location: string) => {
  const normalizedLocation = location.toLowerCase();
  
  for (const city of SOUTH_AFRICA_CITIES) {
    if (normalizedLocation.includes(city.name.toLowerCase())) {
      return {
        lat: city.coordinates.lat + (Math.random() - 0.5) * 0.05,
        lng: city.coordinates.lng + (Math.random() - 0.5) * 0.05,
        province: city.coordinates.province
      };
    }
  }
  
  const randomCity = SOUTH_AFRICA_CITIES[Math.floor(Math.random() * SOUTH_AFRICA_CITIES.length)];
  return {
    lat: randomCity.coordinates.lat + (Math.random() - 0.5) * 0.05,
    lng: randomCity.coordinates.lng + (Math.random() - 0.5) * 0.05,
    province: randomCity.coordinates.province
  };
};

// Map Component with glassy style
const AuctionMap = ({ auctions }: { auctions: Auction[] }) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const [mapReady, setMapReady] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const initMap = async () => {
      try {
        if (!document.querySelector('link[href*="leaflet"]')) {
          const link = document.createElement('link');
          link.rel = 'stylesheet';
          link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
          link.integrity = 'sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=';
          link.crossOrigin = '';
          document.head.appendChild(link);
          await new Promise(resolve => setTimeout(resolve, 500));
        }

        const L = (await import('leaflet')).default;
        
        if (!mounted || !mapRef.current) return;

        if (mapInstanceRef.current) {
          mapInstanceRef.current.remove();
          mapInstanceRef.current = null;
        }

        const map = L.map(mapRef.current, {
          center: [-28.4793, 24.6727],
          zoom: 6,
          zoomControl: true,
          scrollWheelZoom: false,
          dragging: true,
          tap: false,
          doubleClickZoom: false,
          boxZoom: false,
          keyboard: false,
          touchZoom: false,
        });
        
        mapInstanceRef.current = map;

        // Use a stylish map tile layer
        L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
          maxZoom: 19,
          subdomains: 'abcd',
        }).addTo(map);

        // Add a subtle gradient overlay for glass effect
        const style = document.createElement('style');
        style.innerHTML = `
          .leaflet-container {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          }
          .glass-marker {
            backdrop-filter: blur(10px);
            background: rgba(255, 255, 255, 0.25);
            border: 1px solid rgba(255, 255, 255, 0.3);
          }
          .glass-popup .leaflet-popup-content-wrapper {
            backdrop-filter: blur(16px) saturate(180%);
            background: rgba(255, 255, 255, 0.75);
            border: 1px solid rgba(255, 255, 255, 0.3);
            border-radius: 16px;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
          }
          .glass-popup .leaflet-popup-tip {
            background: rgba(255, 255, 255, 0.75);
            backdrop-filter: blur(16px);
          }
        `;
        document.head.appendChild(style);
        
        const createCustomIcon = (status: string) => {
          const colors = {
            live: '#10b981',
            closed: '#8b5cf6',
            ended: '#ef4444',
            upcoming: '#3b82f6'
          };
          
          const color = colors[status as keyof typeof colors] || '#6b7280';
          
          return L.divIcon({
            className: 'glass-marker',
            html: `
              <div style="position: relative;">
                <div style="
                  background: ${color};
                  width: 32px;
                  height: 32px;
                  border-radius: 50%;
                  border: 3px solid rgba(255, 255, 255, 0.8);
                  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  backdrop-filter: blur(10px);
                  ${status === 'live' ? 'animation: pulse-marker 2s infinite;' : ''}
                ">
                  <span style="font-size: 14px; color: white;">🎨</span>
                </div>
                ${status === 'live' ? `
                  <div style="
                    position: absolute;
                    top: -2px;
                    left: -2px;
                    right: -2px;
                    bottom: -2px;
                    border-radius: 50%;
                    background: ${color};
                    opacity: 0.4;
                    animation: ripple 2s infinite;
                  "></div>
                ` : ''}
              </div>
            `,
            iconSize: [32, 32],
            iconAnchor: [16, 16],
            popupAnchor: [0, -16]
          });
        };

        if (!document.getElementById('marker-animations')) {
          const style = document.createElement('style');
          style.id = 'marker-animations';
          style.innerHTML = `
            @keyframes pulse-marker {
              0%, 100% { transform: scale(1); opacity: 1; }
              50% { transform: scale(1.1); opacity: 0.9; }
            }
            @keyframes ripple {
              0% { transform: scale(1); opacity: 0.4; }
              100% { transform: scale(1.5); opacity: 0; }
            }
          `;
          document.head.appendChild(style);
        }

        const bounds = L.latLngBounds([]);
        
        auctions.forEach(auction => {
          if (!auction.coordinates) return;

          const marker = L.marker(
            [auction.coordinates.lat, auction.coordinates.lng],
            { icon: createCustomIcon(auction.status) }
          ).addTo(map);

          const popupContent = `
            <div style="padding: 16px; min-width: 240px; font-family: system-ui, -apple-system, sans-serif;">
              <img 
                src="${auction.image}" 
                alt="${auction.title}"
                style="width: 100%; height: 140px; object-fit: cover; border-radius: 12px; margin-bottom: 12px; border: 1px solid rgba(255, 255, 255, 0.2);"
                onerror="this.src='/placeholder-artwork.jpg'"
              />
              <h3 style="font-weight: 700; font-size: 18px; margin: 0 0 6px 0; color: #1f2937; background: linear-gradient(135deg, #1f2937, #4b5563); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">
                ${auction.title}
              </h3>
              <p style="font-size: 14px; color: #6b7280; margin: 0 0 10px 0; font-weight: 500;">
                by ${auction.artist}
              </p>
              <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; padding: 8px 12px; background: rgba(255, 255, 255, 0.5); border-radius: 10px; border: 1px solid rgba(255, 255, 255, 0.2);">
                <span style="
                  padding: 4px 10px;
                  border-radius: 6px;
                  font-size: 10px;
                  font-weight: 700;
                  text-transform: uppercase;
                  background: ${auction.status === 'live' ? '#10b981' : auction.status === 'upcoming' ? '#3b82f6' : auction.status === 'ended' ? '#ef4444' : '#8b5cf6'};
                  color: white;
                  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
                ">
                  ${auction.status}
                </span>
                <span style="font-weight: 800; color: #10b981; font-size: 18px; text-shadow: 0 1px 2px rgba(0,0,0,0.1);">
                  R${auction.currentBid.toLocaleString()}
                </span>
              </div>
              <div style="font-size: 11px; color: #6b7280; margin-bottom: 14px; display: flex; align-items: center; gap: 6px; font-weight: 500;">
                <span style="background: rgba(59, 130, 246, 0.1); padding: 3px 6px; border-radius: 6px; border: 1px solid rgba(59, 130, 246, 0.2);">
                  📍 ${auction.location}
                </span>
              </div>
              <button 
                onclick="window.location.href='/auction/${auction.id}'"
                style="
                  width: 100%;
                  background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
                  color: white;
                  border: none;
                  padding: 12px 16px;
                  border-radius: 10px;
                  font-weight: 700;
                  font-size: 14px;
                  cursor: pointer;
                  transition: all 0.2s;
                  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
                  backdrop-filter: blur(10px);
                "
                onmouseover="this.style.transform='translateY(-1px)'; this.style.boxShadow='0 6px 20px rgba(59, 130, 246, 0.4)'"
                onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 4px 12px rgba(59, 130, 246, 0.3)'"
              >
                View Auction →
              </button>
            </div>
          `;

          marker.bindPopup(popupContent, {
            maxWidth: 280,
            className: 'glass-popup'
          });

          bounds.extend([auction.coordinates.lat, auction.coordinates.lng]);
        });

        if (auctions.length > 0 && bounds.isValid()) {
          map.fitBounds(bounds, { padding: [50, 50], maxZoom: 12 });
        }

        if (mounted) {
          setMapReady(true);
          setMapError(null);
        }

      } catch (error) {
        console.error('Map initialization error:', error);
        if (mounted) {
          setMapError('Failed to load map');
        }
      }
    };

    initMap();

    return () => {
      mounted = false;
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [auctions]);

  if (mapError) {
    return (
      <div className="w-full h-[500px] rounded-2xl border border-white/20 bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center backdrop-blur-sm">
        <div className="text-center space-y-2">
          <MapPin className="w-12 h-12 mx-auto text-blue-400" />
          <p className="text-blue-600 font-medium">{mapError}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-[500px] rounded-2xl overflow-hidden border border-white/20 shadow-2xl bg-gradient-to-br from-blue-50 to-indigo-100 backdrop-blur-sm">
      {!mapReady && (
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center z-10 backdrop-blur-sm">
          <div className="text-center">
            <div className="relative w-16 h-16 mx-auto mb-4">
              <div className="absolute inset-0 border-4 border-blue-200 rounded-full animate-ping"></div>
              <div className="relative w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            </div>
            <p className="text-blue-700 font-medium">Loading map...</p>
          </div>
        </div>
      )}
      <div ref={mapRef} className="w-full h-full rounded-2xl" />
    </div>
  );
};

const Browse = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const urlQuery = searchParams.get('query') || '';
  const urlLocation = searchParams.get('location') || '';

  // Add custom styles for browse page featured auctions
  useEffect(() => {
    const style = document.createElement('style');
    style.id = 'browse-featured-styles';
    style.innerHTML = `
      @media (min-width: 768px) {
        .browse-featured-auctions .location-badge {
          font-size: 0.7rem !important;
          padding: 0.25rem 0.5rem !important;
        }
        .browse-featured-auctions .location-badge svg {
          width: 0.75rem !important;
          height: 0.75rem !important;
        }
        .browse-featured-auctions .status-live,
        .browse-featured-auctions .status-upcoming,
        .browse-featured-auctions .status-ended,
        .browse-featured-auctions .bg-purple-600,
        .browse-featured-auctions .bg-green-500 {
          font-size: 0.7rem !important;
          padding: 0.25rem 0.5rem !important;
        }
      }
    `;
    document.head.appendChild(style);

    return () => {
      const existingStyle = document.getElementById('browse-featured-styles');
      if (existingStyle) {
        existingStyle.remove();
      }
    };
  }, []);
  
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [searchQuery, setSearchQuery] = useState(urlQuery);
  const [auctions, setAuctions] = useState<Auction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [currentUserId, setCurrentUserId] = useState<string>('');
  const [showMoreFilters, setShowMoreFilters] = useState(false);
  
  const [filters, setFilters] = useState<Filters>({
    category: "all",
    priceRange: "all",
    distance: "all",
    status: "all",
    sortBy: "ending-soon"
  });

  useEffect(() => {
    const getUserId = async () => {
      try {
        const { username } = await getCurrentUser();
        setCurrentUserId(username);
      } catch (error) {
        console.log('User not logged in');
      }
    };
    getUserId();
  }, []);

  useEffect(() => {
    if (urlQuery) {
      setSearchQuery(urlQuery);
    }
  }, [urlQuery]);

  useEffect(() => {
    fetchAuctions();
  }, []);

  const fetchAuctions = async () => {
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

      const transformedAuctions: Auction[] = auctionData.map((auction: any) => {
        const location = auction.location || "Johannesburg";
        const coordinates = generateCoordinates(location);
        
        return {
          id: auction.auctionId || auction.id,
          title: auction.title || `Auction ${auction.auctionId}`,
          artist: auction.artistName || auction.artist || "Unknown Artist",
          artistId: auction.artistId,
          currentBid: auction.currentBid || auction.startingBid || 0,
          timeRemaining: auction.timeRemaining || "",
          image: auction.image || (auction.images && auction.images[0]) || '/placeholder-artwork.jpg',
          status: auction.status || "upcoming",
          location: location,
          distance: auction.distance || "0 km",
          medium: auction.medium,
          year: auction.year,
          bidders: auction.bidders || auction.bidCount || 0,
          startDate: auction.startDate,
          endDate: auction.endDate,
          highestBidder: auction.highestBidder,
          coordinates
        };
      });
      
      setAuctions(transformedAuctions);
      
    } catch (err) {
      console.error('Error fetching auctions:', err);
      setError(err instanceof Error ? err.message : 'Failed to load auctions');
      setAuctions([]);
    } finally {
      setLoading(false);
    }
  };

  const handlePlaceBid = async (auctionId: string) => {
    try {
      const { username: userId } = await getCurrentUser();
      const { tokens } = await fetchAuthSession();
      
      if (!tokens?.idToken) {
        toast({
          title: "Authentication required",
          description: "Please sign in to place a bid",
          variant: "destructive"
        });
        return;
      }

      const auction = auctions.find(a => a.id === auctionId);
      if (!auction) return;

      const minBid = auction.currentBid + 100;
      const bidAmount = Number(
        prompt(`Enter your bid amount (Minimum: R${minBid.toLocaleString()}):`)
      );
      
      if (!bidAmount || isNaN(bidAmount) || bidAmount < minBid) {
        toast({
          title: "Invalid bid",
          description: `Bid must be at least R${minBid.toLocaleString()}`,
          variant: "destructive"
        });
        return;
      }

      const response = await fetch(`${API_BASE}/auctions/bid`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${tokens.idToken.toString()}`
        },
        body: JSON.stringify({
          auctionId,
          bidAmount,
          bidderId: userId
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to place bid');
      }
      
      toast({
        title: "Success!",
        description: "Your bid has been placed successfully",
      });
      
      setAuctions(prev => prev.map(a => 
        a.id === auctionId 
          ? { ...a, currentBid: bidAmount, bidders: (a.bidders || 0) + 1 }
          : a
      ));
      
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to place bid",
        variant: "destructive"
      });
    }
  };

  const filteredAuctions = auctions.filter(auction => {
    const searchTerm = searchQuery.toLowerCase();
    const locationTerm = urlLocation.toLowerCase();
    
    const matchesQuery = searchQuery ? 
      auction.title.toLowerCase().includes(searchTerm) ||
      auction.artist.toLowerCase().includes(searchTerm) ||
      auction.medium?.toLowerCase().includes(searchTerm)
      : true;
    
    const matchesLocation = urlLocation ?
      auction.location.toLowerCase().includes(locationTerm)
      : true;

    const matchesCategory = filters.category === "all" || 
      auction.medium?.toLowerCase().includes(filters.category.toLowerCase());

    const matchesPrice = filters.priceRange === "all" ||
      (filters.priceRange === "under500" && auction.currentBid < 500) ||
      (filters.priceRange === "500-1000" && auction.currentBid >= 500 && auction.currentBid <= 1000) ||
      (filters.priceRange === "1000-2500" && auction.currentBid >= 1000 && auction.currentBid <= 2500) ||
      (filters.priceRange === "over2500" && auction.currentBid > 2500);

    const matchesStatus = filters.status === "all" || auction.status === filters.status;

    return matchesQuery && matchesLocation && matchesCategory && matchesPrice && matchesStatus;
  });

  const sortedAuctions = useMemo(() => {
    return [...filteredAuctions].sort((a, b) => {
      switch (filters.sortBy) {
        case "ending-soon":
          return a.timeRemaining.localeCompare(b.timeRemaining);
        case "newest":
          return b.id.localeCompare(a.id);
        case "price-low":
          return a.currentBid - b.currentBid;
        case "price-high":
          return b.currentBid - a.currentBid;
        default:
          return 0;
      }
    });
  }, [filteredAuctions, filters.sortBy]);

  // Get top 3 featured auctions (mix of live auctions and recently created/upcoming)
  const featuredAuctions = useMemo(() => {
    return [...sortedAuctions]
      .sort((a, b) => {
        // Prioritize live auctions first
        if (a.status === 'live' && b.status !== 'live') return -1;
        if (a.status !== 'live' && b.status === 'live') return 1;
        
        // Then prioritize upcoming auctions
        if (a.status === 'upcoming' && b.status !== 'upcoming') return -1;
        if (a.status !== 'upcoming' && b.status === 'upcoming') return 1;
        
        // Then prioritize recently created (by ID or start date)
        const aDate = a.startDate ? new Date(a.startDate).getTime() : parseInt(a.id);
        const bDate = b.startDate ? new Date(b.startDate).getTime() : parseInt(b.id);
        
        // Sort by most recent first
        return bDate - aDate;
      })
      .slice(0, 3);
  }, [sortedAuctions]);

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    if (value) {
      searchParams.set('query', value);
    } else {
      searchParams.delete('query');
    }
    setSearchParams(searchParams);
  };

  const clearAllFilters = () => {
    setSearchQuery('');
    setFilters({
      category: "all",
      priceRange: "all",
      distance: "all",
      status: "all",
      sortBy: "ending-soon"
    });
    setSearchParams({});
  };

  const hasActiveFilters = searchQuery || urlLocation || 
    Object.values(filters).some(filter => filter !== "all" && filter !== "ending-soon");

  const removeFilter = (filterType: keyof Filters) => {
    setFilters(prev => ({ ...prev, [filterType]: "all" }));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-300 to-gray-500">
        <Header />
        <div className="container mx-auto px-4 py-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <Card key={i} className="animate-pulse backdrop-blur-xl bg-white/20 border border-white/30">
                <CardContent className="p-0">
                  <Skeleton className="h-48 w-full rounded-t-lg" />
                  <div className="p-4 space-y-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-300 to-gray-500">
      <Header />
      
      <div className="container mx-auto px-4 py-8">
        {/* Search and Filters */}
        <div className="mb-8 space-y-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input 
                placeholder="Search artworks, artists, or styles..."
                className="pl-10 backdrop-blur-xl bg-white/20 border border-white/30"
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
              />
            </div>
            <div className="flex space-x-2 overflow-x-auto pb-2">
              <Select 
                value={filters.category} 
                onValueChange={(value) => setFilters(prev => ({ ...prev, category: value }))}
              >
                <SelectTrigger className="w-40 backdrop-blur-xl bg-white/20 border border-white/30">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent className="backdrop-blur-xl bg-white/20 border border-white/30">
                  <SelectItem value="all">All Categories</SelectItem>
                  <SelectItem value="paintings">Paintings</SelectItem>
                  <SelectItem value="sculptures">Sculptures</SelectItem>
                  <SelectItem value="photography">Photography</SelectItem>
                  <SelectItem value="digital">Digital Art</SelectItem>
                </SelectContent>
              </Select>
              
              <Select 
                value={filters.priceRange} 
                onValueChange={(value) => setFilters(prev => ({ ...prev, priceRange: value }))}
              >
                <SelectTrigger className="w-32 backdrop-blur-xl bg-white/20 border border-white/30">
                  <SelectValue placeholder="Price" />
                </SelectTrigger>
                <SelectContent className="backdrop-blur-xl bg-white/20 border border-white/30">
                  <SelectItem value="all">All Prices</SelectItem>
                  <SelectItem value="under500">Under R500</SelectItem>
                  <SelectItem value="500-1000">R500 - R1,000</SelectItem>
                  <SelectItem value="1000-2500">R1,000 - R2,500</SelectItem>
                  <SelectItem value="over2500">Over R2,500</SelectItem>
                </SelectContent>
              </Select>
              
              <Select 
                value={filters.distance} 
                onValueChange={(value) => setFilters(prev => ({ ...prev, distance: value }))}
              >
                <SelectTrigger className="w-32 backdrop-blur-xl bg-white/20 border border-white/30">
                  <SelectValue placeholder="Distance" />
                </SelectTrigger>
                <SelectContent className="backdrop-blur-xl bg-white/20 border border-white/30">
                  <SelectItem value="all">Any Distance</SelectItem>
                  <SelectItem value="5">Within 5 km</SelectItem>
                  <SelectItem value="10">Within 10 km</SelectItem>
                  <SelectItem value="25">Within 25 km</SelectItem>
                  <SelectItem value="50">Within 50 km</SelectItem>
                </SelectContent>
              </Select>
              
              <Button 
                variant="outline" 
                onClick={() => setShowMoreFilters(!showMoreFilters)}
                className="backdrop-blur-xl bg-white/20 border border-white/30"
              >
                <Filter className="w-4 h-4 mr-2" />
                More Filters
              </Button>
            </div>
          </div>

          {showMoreFilters && (
            <div className="p-4 rounded-lg backdrop-blur-xl bg-white/20 border border-white/30">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Select 
                  value={filters.status} 
                  onValueChange={(value) => setFilters(prev => ({ ...prev, status: value }))}
                >
                  <SelectTrigger className="backdrop-blur-xl bg-white/20 border border-white/30">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent className="backdrop-blur-xl bg-white/20 border border-white/30">
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="live">Live Only</SelectItem>
                    <SelectItem value="upcoming">Upcoming</SelectItem>
                    <SelectItem value="ended">Ended</SelectItem>
                  </SelectContent>
                </Select>
                
                <Select 
                  value={filters.sortBy} 
                  onValueChange={(value) => setFilters(prev => ({ ...prev, sortBy: value }))}
                >
                  <SelectTrigger className="backdrop-blur-xl bg-white/20 border border-white/30">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="backdrop-blur-xl bg-white/20 border border-white/30">
                    <SelectItem value="ending-soon">Ending Soon</SelectItem>
                    <SelectItem value="newest">Newest First</SelectItem>
                    <SelectItem value="price-low">Price: Low to High</SelectItem>
                    <SelectItem value="price-high">Price: High to Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {/* Active Filters */}
          {hasActiveFilters && (
            <div className="flex items-center space-x-2 flex-wrap gap-2">
              <span className="text-sm text-muted-foreground">Active filters:</span>
              
              {urlLocation && (
                <Badge variant="secondary" className="backdrop-blur-xl bg-white/20 border border-white/30">
                  <MapPin className="w-3 h-3 mr-1" />
                  {urlLocation}
                  <X className="w-3 h-3 ml-1 cursor-pointer" onClick={() => {
                    searchParams.delete('location');
                    setSearchParams(searchParams);
                  }} />
                </Badge>
              )}
              
              {searchQuery && (
                <Badge variant="secondary" className="backdrop-blur-xl bg-white/20 border border-white/30">
                  <Search className="w-3 h-3 mr-1" />
                  "{searchQuery}"
                  <X className="w-3 h-3 ml-1 cursor-pointer" onClick={() => handleSearchChange('')} />
                </Badge>
              )}
              
              {filters.category !== "all" && (
                <Badge variant="secondary" className="backdrop-blur-xl bg-white/20 border border-white/30">
                  Category: {filters.category}
                  <X className="w-3 h-3 ml-1 cursor-pointer" onClick={() => removeFilter('category')} />
                </Badge>
              )}
              
              {filters.status !== "all" && (
                <Badge variant="secondary" className="backdrop-blur-xl bg-white/20 border border-white/30">
                  Status: {filters.status}
                  <X className="w-3 h-3 ml-1 cursor-pointer" onClick={() => removeFilter('status')} />
                </Badge>
              )}
              
              <Button variant="ghost" size="sm" onClick={clearAllFilters} className="backdrop-blur-xl bg-white/20 border border-white/30">
                Clear all
              </Button>
            </div>
          )}
        </div>

        {/* Results Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="font-playfair text-2xl font-bold">
              {searchQuery || urlLocation ? "Search Results" : "Browse Auctions"}
            </h1>
            <p className="text-muted-foreground">{sortedAuctions.length} auctions found</p>
          </div>
          
          <div className="flex items-center space-x-2">
            <Select 
              value={filters.sortBy}
              onValueChange={(value) => setFilters(prev => ({ ...prev, sortBy: value }))}
            >
              <SelectTrigger className="w-40 backdrop-blur-xl bg-white/20 border border-white/30">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="backdrop-blur-xl bg-white/20 border border-white/30">
                <SelectItem value="ending-soon">Ending Soon</SelectItem>
                <SelectItem value="newest">Newest First</SelectItem>
                <SelectItem value="price-low">Price: Low to High</SelectItem>
                <SelectItem value="price-high">Price: High to Low</SelectItem>
              </SelectContent>
            </Select>
            
            <div className="flex border rounded-md backdrop-blur-xl bg-white/20 border border-white/30">
              <Button
                variant={viewMode === "grid" ? "default" : "ghost"}
                size="sm"
                onClick={() => setViewMode("grid")}
                className="rounded-r-none backdrop-blur-xl bg-white/20 border border-white/30"
              >
                <Grid className="w-4 h-4" />
              </Button>
              <Button
                variant={viewMode === "list" ? "default" : "ghost"}
                size="sm"
                onClick={() => setViewMode("list")}
                className="rounded-l-none backdrop-blur-xl bg-white/20 border border-white/30"
              >
                <List className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Featured Auctions Section - Only 3 cards */}
        {featuredAuctions.length > 0 && (
          <div className="mb-8">
            <h2 className="font-playfair text-xl font-bold mb-4">Featured Auctions</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 browse-featured-auctions">
              {featuredAuctions.map((auction) => (
                <AuctionCard
                  key={auction.id}
                  id={auction.id}
                  title={auction.title}
                  artist={auction.artist}
                  artistId={auction.artistId}
                  currentBid={auction.currentBid}
                  timeRemaining={auction.timeRemaining}
                  location={auction.location}
                  bidders={auction.bidders}
                  image={auction.image}
                  status={auction.status}
                  distance={auction.distance}
                  onPlaceBid={handlePlaceBid}
                  endDate={auction.endDate}
                  startDate={auction.startDate}
                  currentUserId={currentUserId}
                  highestBidder={auction.highestBidder}
                  compact={true}
                />
              ))}
            </div>
          </div>
        )}

        {/* Map Section - Glassy style */}
        <div className="mb-8">
          <div className="rounded-2xl border border-white/20 shadow-2xl overflow-hidden backdrop-blur-xl bg-white/20 border border-white/30">
            <div className="p-4 border-b border-white/20 bg-gradient-to-r from-blue-50/80 to-indigo-50/80 backdrop-blur-sm">
              <div className="flex items-center justify-center">
                <h3 className="font-playfair text-xl font-bold text-gray-800 flex items-center">
                  <MapPin className="w-5 h-5 mr-2 text-blue-600" />
                  South Africa
                </h3>
              </div>
            </div>

            <div className="p-2 sm:p-4">
              <AuctionMap auctions={sortedAuctions} />
            </div>

            <div className="p-3 sm:p-4 border-t border-white/20 bg-gray-50/80 backdrop-blur-sm">
              <div className="flex flex-col xs:flex-row xs:items-center xs:justify-between gap-2 text-sm text-gray-600">
                <div className="flex items-center justify-center xs:justify-start space-x-4">
                  <div className="flex items-center space-x-2">
                    <MapPin className="w-4 h-4 text-blue-500" />
                    <span>{sortedAuctions.length} auctions</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                    <span>{sortedAuctions.filter(a => a.status === 'live').length} live</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* No Results */}
        {sortedAuctions.length === 0 && !loading && (
          <div className="text-center py-12">
            <div className="text-muted-foreground space-y-2">
              <Search className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <h3 className="font-semibold text-lg">No auctions found</h3>
              <p>Try adjusting your search criteria or filters</p>
              <Button onClick={clearAllFilters} className="mt-4 backdrop-blur-xl bg-white/20 border border-white/30">
                Clear All Filters
              </Button>
            </div>
          </div>
        )}
      </div>

      <Footer />
    </div>
  );
};

export default Browse;