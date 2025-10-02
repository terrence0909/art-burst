// src/api/auctions.ts - UPDATED TO MATCH Auction TYPE
import { fetchAuthSession } from "aws-amplify/auth";
import { Auction } from '@/types/auction';

const API_BASE_URL = "/api";

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
  if (!endDate) return "Time not specified";
  
  const end = new Date(endDate);
  const now = new Date();
  const diff = end.getTime() - now.getTime();
  
  if (diff <= 0) return "Auction ended";
  
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  
  return `${days}d ${hours}h`;
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

// FIXED: Better image handling with correct S3 paths
const getImageUrl = (item: any): string => {
  const possibleImageFields = [
    item.image,
    item.imageUrl,
    item.images?.L?.[0]?.S, // This is where your images are stored!
    item.images?.url,
    item.images?.M?.url?.S,
    item.images?.[0],
    item.artworkImage,
    item.thumbnail
  ];

  for (const imageField of possibleImageFields) {
    if (typeof imageField === 'string' && imageField) {
      console.log('🖼️ Processing image field:', imageField);
      
      // If it's already a full URL, fix the path if needed
      if (imageField.startsWith('http')) {
        // Fix URLs that have wrong path (auctions/ instead of public/auctions/)
        if (imageField.includes('/auctions/') && !imageField.includes('/public/auctions/')) {
          const fixedUrl = imageField.replace('/auctions/', '/public/auctions/');
          console.log('🔄 Fixed URL:', fixedUrl);
          return fixedUrl;
        }
        return imageField;
      }
      
      // If it starts with "public/auctions/" - already correct
      if (imageField.startsWith('public/auctions/')) {
        return `https://art-burst.s3.amazonaws.com/${imageField}`;
      }
      
      // If it starts with just "auctions/" - add "public/" prefix
      if (imageField.startsWith('auctions/')) {
        return `https://art-burst.s3.amazonaws.com/public/${imageField}`;
      }
      
      // If it's just a filename - add full path
      return `https://art-burst.s3.amazonaws.com/public/auctions/${imageField}`;
    }
  }

  return "/placeholder-image.jpg";
};

// Transform raw auction data into Auction type
const transformAuction = (item: any): Auction => {
  let status: "live" | "upcoming" | "ended";

  if (item.status === "active") {
    status = "live";
  } else if (item.status === "completed" || item.status === "cancelled") {
    status = "ended";
  } else {
    status = "upcoming";
  }

  return {
    id: item.auctionId || item.id,
    auctionId: item.auctionId || item.id,
    title: item.title || "Untitled Artwork",
    artistName: item.artistName || item.artist || "Unknown Artist",
    currentBid: item.currentBid || item.startingBid || 0,
    startingBid: item.startingBid || item.currentBid || 0,
    timeRemaining: item.timeRemaining || calculateTimeRemaining(item.endDate),
    location: item.location || "Location not specified",
    bidders: item.bidders || item.bidCount || item.totalBids || 0,
    bidCount: item.bidCount || item.totalBids || 0,
    image: getImageUrl(item),
    status: status,
    description: item.description || "",
    bidIncrement: item.bidIncrement || 100,
    distance: item.distance || calculateDistance(item.location),
    totalBids: item.totalBids || item.bidCount || 0,
    watchers: item.watchers || 0,
    medium: item.medium || "Not specified",
    dimensions: formatDimensions(item.dimensions),
    year: item.year || new Date().getFullYear().toString(),
    condition: item.condition || "Excellent",
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
    highestBidder: item.highestBidder || item.winningBidderId,
    bids: item.bids || [],
    endTime: item.endTime || item.endDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
  };
};

// Fetch auctions with proper transformation to match Auction type
export const fetchAuctions = async (): Promise<Auction[]> => {
  try {
    const data = await handleFetch(`${API_BASE_URL}/auctions`);
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