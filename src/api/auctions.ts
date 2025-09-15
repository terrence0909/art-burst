// src/api/auctions.ts
import { fetchAuthSession } from "aws-amplify/auth";
import { Auction } from '@/types/auction'; // Import the interface

const API_BASE_URL = "https://v3w12ytklh.execute-api.us-east-1.amazonaws.com/prod";

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

// Fetch auctions with status transformation
export const fetchAuctions = async (): Promise<Auction[]> => {
  try {
    const data = await handleFetch(`${API_BASE_URL}/auctions`);
    
    // Transform the data to match the Auction interface
    return data.map((item: any): Auction => {
      // Transform backend status to frontend status
      let status: 'live' | 'upcoming' | 'ended';
      
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
        timeRemaining: item.timeRemaining || calculateTimeRemaining(item.endDate),
        location: item.location || "Location not specified",
        bidders: item.bidCount || item.totalBids || 0,
        bidCount: item.bidCount || item.totalBids || 0,
        image: item.image || (item.images && item.images[0]) || "/placeholder-image.jpg",
        status: status, // ← This is the key transformation!
        description: item.description,
        bidIncrement: item.bidIncrement || 100,
        distance: item.distance || calculateDistance(item.location),
        totalBids: item.bidCount || item.totalBids || 0,
        watchers: item.watchers || 0,
        medium: item.medium || "Not specified",
        dimensions: item.dimensions || "Dimensions not specified",
        year: item.year || new Date().getFullYear().toString(),
        condition: item.condition || "Excellent",
        startingBid: item.startingBid || 0,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt
      };
    });
    
  } catch (error) {
    console.error("Error fetching auctions:", error);
    throw error;
  }
};

// Helper functions (keep these)
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

// Keep your other functions like fetchAuctionById, placeBid, etc.
export const fetchAuctionById = async (id: string): Promise<Auction> => {
  try {
    const data = await handleFetch(`${API_BASE_URL}/auctions/${id}`);
    
    // Apply the same transformation
    return {
      ...data,
      status: data.status === "active" ? "live" : 
              data.status === "completed" ? "ended" : "upcoming"
    };
  } catch (error) {
    console.error("Error fetching auction:", error);
    throw error;
  }
};

export const placeBid = async (auctionId: string, amount: number): Promise<any> => {
  // Your existing bid placement logic
  // ...
};