import { fetchAuthSession } from "aws-amplify/auth";

const API_BASE_URL = "https://v3w12ytklh.execute-api.us-east-1.amazonaws.com/prod";

// Enhanced fetch handler with authentication and better error reporting
const handleFetch = async (url: string, options: RequestInit = {}) => {
  try {
    console.log("Fetching from:", url);
    
    // Get authentication token
    const session = await fetchAuthSession();
    const idToken = session.tokens?.idToken?.toString();
    
    console.log("Authentication token available:", !!idToken);
    
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(idToken && { 'Authorization': `Bearer ${idToken}` }),
        ...options.headers,
      },
    });
    
    console.log("Response status:", response.status, response.statusText);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error("API Error Details:", {
        status: response.status,
        statusText: response.statusText,
        url: url,
        error: errorText
      });
      
      // Handle specific error cases
      if (response.status === 401) {
        throw new Error("Authentication required. Please sign in again.");
      } else if (response.status === 403) {
        throw new Error("Access forbidden. You may not have permission to view this auction.");
      } else if (response.status === 404) {
        throw new Error("Auction not found.");
      }
      
      throw new Error(`HTTP ${response.status}: ${response.statusText} - ${errorText}`);
    }
    
    const data = await response.json();
    console.log("API Response data:", data);
    return data;
  } catch (error) {
    console.error("Error fetching data from API:", error);
    throw error;
  }
};

// Helper functions for data transformation
const calculateTimeRemaining = (startDate?: string, endDate?: string): string => {
  if (!endDate) return "Time not specified";
  
  const end = new Date(endDate);
  const now = new Date();
  const diff = end.getTime() - now.getTime();
  
  if (diff <= 0) return "Auction ended";
  
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  
  return `${days}d ${hours}h`;
};

const getStatus = (status?: string, startDate?: string, endDate?: string): "live" | "upcoming" | "ended" => {
  if (status === "active" || status === "live") return "live";
  if (status === "draft" || status === "upcoming") return "upcoming";
  if (status === "completed" || status === "cancelled" || status === "ended") return "ended";
  
  // Fallback based on dates
  if (startDate && endDate) {
    const now = new Date();
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    if (now < start) return "upcoming";
    if (now > end) return "ended";
    return "live";
  }
  
  return "upcoming"; // Default
};

const formatDimensions = (dimensions: any): string => {
  if (!dimensions) return "Dimensions not specified";
  
  if (typeof dimensions === 'string') return dimensions;
  
  if (dimensions.width && dimensions.height) {
    return `${dimensions.width}" × ${dimensions.height}"${dimensions.depth ? ` × ${dimensions.depth}"` : ''}`;
  }
  
  return "Dimensions not specified";
};

const calculateDistance = (location?: string): string => {
  if (!location) return "Distance not available";
  
  // Simple mock distance calculation - replace with real geolocation later
  const distances = ["1 km", "3 km", "5 km", "10 km", "25 km"];
  return distances[Math.floor(Math.random() * distances.length)] + " away";
};

// Fetch a single auction by ID with data transformation
export const fetchAuctionById = async (id: string) => {
  try {
    console.log("Fetching auction ID:", id);
    
    const data = await handleFetch(`${API_BASE_URL}/auctions/${id}`);
    
    if (!data) {
      console.warn("No data returned for auction ID:", id);
      return null;
    }

    console.log("Raw auction data from API:", data);

    // Transform the data to match your component's expectations
    return {
      id: data.auctionId || data.id || id,
      title: data.title || "Untitled Artwork",
      artist: data.artistName || data.artist || "Unknown Artist",
      description: data.description || "No description available",
      currentBid: data.currentBid || data.startingBid || 0,
      bidIncrement: data.bidIncrement || 100,
      timeRemaining: calculateTimeRemaining(data.startDate, data.endDate) || "2 days 12 hours",
      image: data.images?.[0] || data.image || "/placeholder-image.jpg",
      status: getStatus(data.status, data.startDate, data.endDate),
      location: data.location || "Location not specified",
      distance: calculateDistance(data.location) || "5 km away",
      totalBids: data.totalBids || data.bidHistory?.length || 0,
      watchers: data.watchers || 0,
      medium: data.medium || "Not specified",
      dimensions: formatDimensions(data.dimensions) || "Dimensions not specified",
      year: data.year || new Date().getFullYear().toString(),
      condition: data.condition || "Excellent",
      bidHistory: data.bidHistory || [],
      startingBid: data.startingBid || 0
    };
  } catch (error) {
    console.error("Error fetching auction data for ID:", id, error);
    throw error; // Re-throw to let the component handle it
  }
};

// Fetch auctions where the user has active bids
export const fetchUserAuctions = async () => {
  try {
    const data = await handleFetch(`${API_BASE_URL}/auctions/my-bids`);
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error("Error fetching user auctions:", error);
    throw error;
  }
};

// Fetch auctions the user is watching
export const fetchWatchedAuctions = async () => {
  try {
    const data = await handleFetch(`${API_BASE_URL}/auctions/watched`);
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error("Error fetching watched auctions:", error);
    throw error;
  }
};

// Fetch recent activity for the user
export const fetchRecentActivity = async () => {
  try {
    const data = await handleFetch(`${API_BASE_URL}/user/activity`);
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error("Error fetching recent activity:", error);
    throw error;
  }
};

// Test function to debug API connection
export const testAuctionConnection = async (id: string) => {
  try {
    console.log("Testing connection to auction ID:", id);
    
    const session = await fetchAuthSession();
    const idToken = session.tokens?.idToken?.toString();
    
    console.log("Test authentication token available:", !!idToken);
    
    const response = await fetch(`${API_BASE_URL}/auctions/${id}`, {
      headers: {
        'Content-Type': 'application/json',
        ...(idToken && { 'Authorization': `Bearer ${idToken}` })
      }
    });
    
    console.log("Test response status:", response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error("Test failed:", errorText);
      return { 
        success: false, 
        status: response.status, 
        error: errorText,
        requiresAuth: response.status === 401 || response.status === 403
      };
    }
    
    const data = await response.json();
    console.log("Test successful:", data);
    return { success: true, data };
  } catch (error) {
    console.error("Test connection error:", error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
};

// Place a bid on an auction
export const placeBid = async (auctionId: string, amount: number) => {
  try {
    console.log("Placing bid:", { auctionId, amount });
    
    const data = await handleFetch(`${API_BASE_URL}/auctions/${auctionId}/bids`, {
      method: 'POST',
      body: JSON.stringify({ amount })
    });
    
    console.log("Bid placed successfully:", data);
    return data;
  } catch (error) {
    console.error("Error placing bid:", error);
    throw error;
  }
};

// Watch/unwatch an auction
export const toggleWatchAuction = async (auctionId: string, watch: boolean) => {
  try {
    console.log("Toggling watch:", { auctionId, watch });
    
    const data = await handleFetch(`${API_BASE_URL}/auctions/${auctionId}/watch`, {
      method: watch ? 'POST' : 'DELETE'
    });
    
    console.log("Watch toggled successfully:", data);
    return data;
  } catch (error) {
    console.error("Error toggling watch:", error);
    throw error;
  }
};

// Create a new auction
export const createAuction = async (auctionData: any) => {
  try {
    console.log("Creating auction:", auctionData);
    
    const data = await handleFetch(`${API_BASE_URL}/auctions`, {
      method: 'POST',
      body: JSON.stringify(auctionData)
    });
    
    console.log("Auction created successfully:", data);
    return data;
  } catch (error) {
    console.error("Error creating auction:", error);
    throw error;
  }
};

// Get auctions by status or filters
export const fetchAuctions = async (filters: { 
  status?: string; 
  artist?: string;
  medium?: string;
  limit?: number;
} = {}) => {
  try {
    const queryParams = new URLSearchParams();
    if (filters.status) queryParams.append('status', filters.status);
    if (filters.artist) queryParams.append('artist', filters.artist);
    if (filters.medium) queryParams.append('medium', filters.medium);
    if (filters.limit) queryParams.append('limit', filters.limit.toString());
    
    const url = `${API_BASE_URL}/auctions${queryParams.toString() ? `?${queryParams}` : ''}`;
    const data = await handleFetch(url);
    
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error("Error fetching auctions:", error);
    throw error;
  }
};