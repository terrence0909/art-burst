// src/api/auctions.ts - UPDATED TO MATCH Auction TYPE
import { fetchAuthSession } from "aws-amplify/auth";
import { Auction } from '@/types/auction';

// 🔥 FIX: Use the environment variable
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

// Enhanced fetch handler with authentication
const handleFetch = async (url: string, options: RequestInit = {}) => {
  try {
    // Get authentication token
    const session = await fetchAuthSession();
    const idToken = session.tokens?.idToken?.toString();
    
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(idToken && { 'Authorization': `Bearer ${idToken}` }),
        ...options.headers,
      },
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${response.statusText} - ${errorText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error("Error fetching data from API:", error);
    throw error;
  }
};

// Helper functions
const calculateTimeRemaining = (endDate?: string): string => {
  if (!endDate) return new Date(Date.now() + 60 * 60 * 1000).toISOString(); // Default 1 hour
  
  // Return the actual end date - let the frontend calculate the remaining time
  return endDate;
};

const calculateDistance = (location?: string): string => {
  if (!location) return "Distance not available";
  
  const distances = ["1 km", "3 km", "5 km", "10 km", "25 km"];
  return distances[Math.floor(Math.random() * distances.length)] + " away";
};

// Fix dimensions - convert object to string
const formatDimensions = (dims: any): string => {
  if (!dims) return "Dimensions not specified";
  
  if (typeof dims === 'string') return dims;
  
  if (typeof dims === 'object') {
    const { width, height, depth } = dims;
    if (width && height) {
      if (depth) {
        return `${width}" × ${height}" × ${depth}"`;
      }
      return `${width}" × ${height}"`;
    }
  }
  
  return "Dimensions not specified";
};

// SIMPLIFIED: Match the actual API response structure
const getImageUrl = (item: any): string => {
  // Use the image URL directly from API response
  if (item.image && typeof item.image === 'string') {
    return item.image;
  }
  
  // Fallback to first image in images array
  if (item.images && Array.isArray(item.images) && item.images[0] && typeof item.images[0] === 'string') {
    return item.images[0];
  }
  
  return "/placeholder-image.jpg";
};

// FIXED: Transform function that matches actual API data
const transformAuction = (item: any): Auction => {
  console.log('🔄 Transforming auction:', item);
  
  let status: "live" | "upcoming" | "ended" | "closed";

  // Map actual API status values to frontend status
  if (item.status === "active") {
    status = "live";
  } else if (item.status === "completed" || item.status === "cancelled") {
    status = "ended";
  } else if (item.status === "closed") {
    status = "closed";
  } else if (item.status === "upcoming") {
    status = "upcoming";
  } else {
    status = "upcoming"; // default for draft, etc.
  }

  return {
    id: item.auctionId || item.id,
    auctionId: item.auctionId || item.id,
    title: item.title || "Untitled Artwork",
    artistName: item.artistName || "Unknown Artist",
    currentBid: item.currentBid || item.startingBid || 0,
    startingBid: item.startingBid || 0,
    timeRemaining: calculateTimeRemaining(item.endDate),
    location: item.location || "Location not specified",
    bidders: item.bidCount || 0,
    bidCount: item.bidCount || 0,
    image: getImageUrl(item),
    status: status,
    description: item.description || "",
    bidIncrement: item.bidIncrement || 100,
    distance: calculateDistance(item.location),
    totalBids: item.bidCount || 0,
    watchers: 0,
    medium: item.medium || "Not specified",
    dimensions: formatDimensions(item.dimensions),
    year: item.year || new Date().getFullYear().toString(),
    condition: item.condition || "Excellent",
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
    highestBidder: item.highestBidder,
    bids: item.bids || [],
    endTime: item.endDate || "",
    endDate: item.endDate || "",
    startTime: item.startDate || "",
    startDate: item.startDate || "",
    creatorId: item.creatorId || item.userId,
  };
};

// Fetch auctions with proper transformation to match Auction type
export const fetchAuctions = async (): Promise<Auction[]> => {
  try {
    // FIXED: Add ?publishedOnly=true to filter out drafts
    const url = `${API_BASE_URL}/auctions?publishedOnly=true`;
    console.log("🔍 Fetching auctions from:", url);
    console.log("🔍 Full API Base URL:", import.meta.env.VITE_API_BASE_URL);
    
    const data = await handleFetch(url);
    console.log("🔍 API response received:", data);
    console.log("📊 Total auctions after filtering:", data.length);
    
    return data.map(transformAuction);
  } catch (error) {
    console.error("Error fetching auctions:", error);
    throw error;
  }
};

// Fetch single auction
export const fetchAuctionById = async (id: string): Promise<Auction> => {
  try {
    const data = await handleFetch(`${API_BASE_URL}/auctions/${id}`);
    return transformAuction(data);
  } catch (error) {
    console.error("Error fetching auction:", error);
    throw error;
  }
};

// Place a bid
export const placeBid = async (auctionId: string, amount: number): Promise<any> => {
  try {
    const response = await handleFetch(`${API_BASE_URL}/auctions/${auctionId}/bid`, {
      method: 'POST',
      body: JSON.stringify({ amount }),
    });
    
    return response;
  } catch (error) {
    console.error("Error placing bid:", error);
    throw error;
  }
};

// Artist API functions
export const fetchArtistById = async (artistId: string): Promise<any> => {
  try {
    const data = await handleFetch(`${API_BASE_URL}/artists/${artistId}`);
    return data;
  } catch (error) {
    console.error("Error fetching artist:", error);
    throw error;
  }
};

export const createOrUpdateArtist = async (artistData: any): Promise<any> => {
  try {
    const response = await handleFetch(`${API_BASE_URL}/artists`, {
      method: 'POST',
      body: JSON.stringify(artistData),
    });
    return response;
  } catch (error) {
    console.error("Error creating/updating artist:", error);
    throw error;
  }
};

// 🔥 NEW: Sync artist profile with user settings
export const updateArtistFromSettings = async (userId: string, settings: any): Promise<any> => {
  try {
    const artistData = {
      artistId: userId, // 🔥 FIX: Include artistId
      userId: userId,
      name: settings.name || settings.displayName || `${settings.given_name} ${settings.family_name}`.trim(),
      bio: settings.bio || '',
      location: settings.location,
      website: settings.website,
      socialMedia: {
        instagram: settings.instagram
      },
      avatar: settings.avatar_url,
    };
    
    return await createOrUpdateArtist(artistData);
  } catch (error) {
    console.error("Error updating artist from settings:", error);
    throw error;
  }
};