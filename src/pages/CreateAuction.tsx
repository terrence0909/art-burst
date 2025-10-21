import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Upload, X, MapPin, Calendar, Image as ImageIcon, Ruler } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";

// AWS Amplify v6 imports
import { getCurrentUser, fetchAuthSession, fetchUserAttributes } from "aws-amplify/auth";
import { generateClient } from "aws-amplify/api";
import { uploadData } from "aws-amplify/storage";
import { Amplify } from "aws-amplify";
import awsConfig from "../awsConfig.js";

// Configure Amplify
Amplify.configure(awsConfig);

// Generate API client
const client = generateClient();

interface AuctionFormData {
  title: string;
  description: string;
  medium: string;
  year: string;
  dimensions: {
    width: string;
    height: string;
    depth: string;
  };
  dimensionUnit: string;
  startingBid: string;
  reservePrice: string;
  startDate: string;
  endDate: string;
  bidIncrement: string;
  location: string;
  shippingOptions: {
    localPickup: boolean;
    shippingAvailable: boolean;
  };
  shippingCost: string;
}

interface Dimensions {
  width: number;
  height: number;
  depth: number;
}

interface AuctionItem {
  id: string;
  title: string;
  description: string;
  medium: string;
  year: string;
  dimensions: Dimensions;
  startingBid: number;
  reservePrice?: number;
  currentBid?: number;
  startDate: string;
  endDate: string;
  bidIncrement: number;
  location: string;
  shippingOptions: {
    localPickup: boolean;
    shippingAvailable: boolean;
  };
  shippingCost?: number;
  images: string[];
  artistId: string;
  artistName: string;
  status: "draft" | "active" | "completed" | "cancelled";
  createdAt: string;
  updatedAt: string;
}

const CreateAuction = () => {
  const navigate = useNavigate();
  const [images, setImages] = useState<string[]>([]);
  const [uploadedImageKeys, setUploadedImageKeys] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [userLocation, setUserLocation] = useState<string>("");
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [userAttributes, setUserAttributes] = useState<any>(null);

  const [formData, setFormData] = useState<AuctionFormData>({
    title: "",
    description: "",
    medium: "",
    year: new Date().getFullYear().toString(),
    dimensions: {
      width: "",
      height: "",
      depth: ""
    },
    dimensionUnit: "cm",
    startingBid: "",
    reservePrice: "",
    startDate: "",
    endDate: "",
    bidIncrement: "100",
    location: "",
    shippingOptions: {
      localPickup: true,
      shippingAvailable: false
    },
    shippingCost: ""
  });

  // Get current user and location on component mount
  useEffect(() => {
    getCurrentUserInfo();
    getUserLocation();
  }, []);

  // Auto-fill location when userLocation is detected
  useEffect(() => {
    if (userLocation && !formData.location) {
      setFormData(prev => ({
        ...prev,
        location: userLocation
      }));
    }
  }, [userLocation]);

  // Get current user information
  const getCurrentUserInfo = async () => {
    try {
      const user = await getCurrentUser();
      const attributes = await fetchUserAttributes();
      setCurrentUser(user);
      setUserAttributes(attributes);
    } catch (error) {
      console.error("Error getting current user:", error);
    }
  };

  // Function to get user's display name - FIXED to combine first + last name
  const getUserDisplayName = () => {
    // Try to get the name from localStorage first (if user updated their profile)
    const savedName = localStorage.getItem('userDisplayName');
    if (savedName) {
      return savedName;
    }

    // Use the userAttributes we fetched explicitly
    if (userAttributes) {
      const givenName = userAttributes.given_name;
      const familyName = userAttributes.family_name;
      
      if (givenName && familyName) {
        return `${givenName} ${familyName}`; // "Sunshine Mbovu"
      }
      
      // Fallbacks
      return userAttributes.name || 
             userAttributes.nickname ||
             userAttributes.email || // This is the fallback that was showing
             currentUser?.username || 
             "Artist";
    }
    
    // Fallback if no attributes yet
    return currentUser?.username || "Artist";
  };

  // 🔥 ADD THIS: Get the same user ID used in AuctionGrid
  const getAuctionGridUserId = () => {
    // Use the same logic as AuctionGrid
    const storedUserId = localStorage.getItem('auction-user-id');
    if (storedUserId) return storedUserId;
    
    // Create new user ID and store it (same as AuctionGrid)
    const newUserId = `user-${Math.random().toString(36).substring(2, 10)}`;
    localStorage.setItem('auction-user-id', newUserId);
    return newUserId;
  };

  // Function to get user's current location - FIXED: Removed HTTPS check for mobile
  const getUserLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          try {
            const { latitude, longitude } = position.coords;
            
            // Use reverse geocoding to get city name
            const response = await fetch(
              `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`
            );
            
            if (response.ok) {
              const data = await response.json();
              const city = data.city || data.locality || data.principalSubdivision;
              const country = data.countryName;
              
              if (city && country) {
                setUserLocation(`${city}, ${country}`);
              } else {
                setUserLocation("Location detected");
              }
            } else {
              setUserLocation("Location detected");
            }
          } catch (error) {
            console.error("Error getting location:", error);
            // Fallback: Try to get location from IP
            getLocationFromIP();
          }
        },
        (error) => {
          console.error("Geolocation error:", error);
          // Fallback: Try to get location from IP
          getLocationFromIP();
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 60000
        }
      );
    } else {
      getLocationFromIP();
    }
  };

  // Fallback: Get location from IP
  const getLocationFromIP = async () => {
    try {
      const response = await fetch('https://ipapi.co/json/');
      if (response.ok) {
        const data = await response.json();
        const city = data.city;
        const country = data.country_name;
        
        if (city && country) {
          setUserLocation(`${city}, ${country}`);
        } else {
          setUserLocation("South Africa"); // Default fallback
        }
      }
    } catch (error) {
      console.error("IP location error:", error);
      setUserLocation("South Africa"); // Default fallback
    }
  };

  // Use detected location
  const useDetectedLocation = () => {
    if (userLocation) {
      setFormData(prev => ({
        ...prev,
        location: userLocation
      }));
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleDimensionChange = (dimension: keyof AuctionFormData['dimensions'], value: string) => {
    setFormData(prev => ({
      ...prev,
      dimensions: {
        ...prev.dimensions,
        [dimension]: value
      }
    }));
  };

  const handleShippingOptionChange = (option: keyof AuctionFormData['shippingOptions'], checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      shippingOptions: {
        ...prev.shippingOptions,
        [option]: checked
      }
    }));
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    if (files.length + images.length > 8) {
      setError("Maximum 8 images allowed");
      return;
    }

    setLoading(true);
    try {
      for (let file of Array.from(files)) {
        if (!file.type.startsWith('image/')) {
          setError("Please select image files only");
          continue;
        }
        if (file.size > 5 * 1024 * 1024) {
      setError("Images must be less than 5MB");
          continue;
        }

        // Upload to S3
        const key = `auctions/${Date.now()}_${file.name}`;
        await uploadData({
          key: key,
          data: file,
          options: {
            contentType: file.type
          }
        }).result;

        // Store both the data URL for preview and the S3 key for database
        const reader = new FileReader();
        reader.onload = (e) => {
          setImages(prev => [...prev, e.target?.result as string]);
          setUploadedImageKeys(prev => [...prev, key]);
          setError("");
        };
        reader.readAsDataURL(file);
      }
    } catch (err) {
      setError("Failed to upload images");
      console.error("Image upload error:", err);
    } finally {
      setLoading(false);
    }
  };

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
    setUploadedImageKeys(prev => prev.filter((_, i) => i !== index));
  };

  const validateForm = (): boolean => {
    if (!formData.title.trim()) {
      setError("Please enter an artwork title");
      return false;
    }
    if (!formData.description.trim()) {
      setError("Please enter a description");
      return false;
    }
    if (!formData.startingBid || parseFloat(formData.startingBid) <= 0) {
      setError("Please enter a valid starting bid");
      return false;
    }
    if (images.length === 0) {
      setError("Please upload at least one image");
      return false;
    }
    if (!formData.startDate || !formData.endDate) {
      setError("Please set auction start and end dates");
      return false;
    }
    if (new Date(formData.endDate) <= new Date(formData.startDate)) {
      setError("Auction end date must be after start date");
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    if (!validateForm()) {
      setLoading(false);
      return;
    }

    try {
      // Get current user and auth token
      const user = await getCurrentUser();
      const session = await fetchAuthSession();
      const idToken = session.tokens?.idToken?.toString();
      
      // 🔥 FIX: Get the same user ID used in AuctionGrid
      const auctionGridUserId = getAuctionGridUserId();
      
      // Prepare auction data
      const auctionData = {
        title: formData.title,
        description: formData.description,
        medium: formData.medium,
        year: formData.year,
        dimensions: {
          width: parseFloat(formData.dimensions.width) || 0,
          height: parseFloat(formData.dimensions.height) || 0,
          depth: parseFloat(formData.dimensions.depth) || 0,
          unit: formData.dimensionUnit
        },
        startingBid: parseFloat(formData.startingBid),
        reservePrice: formData.reservePrice ? parseFloat(formData.reservePrice) : undefined,
        startDate: formData.startDate,
        endDate: formData.endDate,
        bidIncrement: parseFloat(formData.bidIncrement),
        location: formData.location,
        shippingOptions: formData.shippingOptions,
        shippingCost: formData.shippingCost ? parseFloat(formData.shippingCost) : undefined,
        images: uploadedImageKeys,
        artistId: user.userId,
        artistName: getUserDisplayName(),
        creatorWebSocketId: auctionGridUserId,
        // FIX: Calculate status based on start time
        status: new Date(formData.startDate) > new Date() ? "upcoming" : "active",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      console.log("Submitting auction to:", import.meta.env.VITE_API_BASE_URL);
      console.log("Auction data:", auctionData);

      // Create auction using REST API with authentication
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/auctions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(idToken && { 'Authorization': `Bearer ${idToken}` })
        },
        body: JSON.stringify(auctionData)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to create auction: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const result = await response.json();
      console.log("Auction created successfully:", result);

      // 🔥 FIXED: Use the same user ID as AuctionGrid
      import('../services/notificationService').then(({ notificationService }) => {
        notificationService.addNotification({
          userId: auctionGridUserId, // Use the same ID as AuctionGrid
          type: 'BID_CONFIRMED',
          title: 'Auction Created Successfully',
          message: `Your auction "${formData.title}" has been created and will go live as scheduled.`,
          relatedId: result.id || result.auctionId,
          metadata: {
            auctionTitle: formData.title,
            status: 'created',
            startDate: formData.startDate
          }
        });
      });

      // FIXED: Redirect to the new auction details page instead of dashboard
      if (result.id) {
        navigate(`/auction/${result.id}`); // Redirect to auction details
      } else if (result.auctionId) {
        navigate(`/auction/${result.auctionId}`); // Try different ID field names
      } else {
        // Fallback: redirect to dashboard if no ID is returned
        console.warn("No auction ID returned from API, redirecting to dashboard");
        navigate("/dashboard");
      }
      
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create auction");
      console.error("Error creating auction:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveDraft = async () => {
    setLoading(true);
    try {
      // Get current user and auth token
      const user = await getCurrentUser();
      const session = await fetchAuthSession();
      const idToken = session.tokens?.idToken?.toString();
      
      // 🔥 FIX: Get the same user ID used in AuctionGrid
      const auctionGridUserId = getAuctionGridUserId();
      
      const auctionData = {
        title: formData.title,
        description: formData.description,
        medium: formData.medium,
        year: formData.year,
        dimensions: {
          width: parseFloat(formData.dimensions.width) || 0,
          height: parseFloat(formData.dimensions.height) || 0,
          depth: parseFloat(formData.dimensions.depth) || 0,
          unit: formData.dimensionUnit
        },
        startingBid: parseFloat(formData.startingBid),
        reservePrice: formData.reservePrice ? parseFloat(formData.reservePrice) : undefined,
        startDate: formData.startDate,
        endDate: formData.endDate,
        bidIncrement: parseFloat(formData.bidIncrement),
        location: formData.location,
        shippingOptions: formData.shippingOptions,
        shippingCost: formData.shippingCost ? parseFloat(formData.shippingCost) : undefined,
        images: uploadedImageKeys,
        artistId: user.userId,
        creatorWebSocketId: auctionGridUserId,
        status: "draft" as const,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      console.log("Saving draft to:", import.meta.env.VITE_API_BASE_URL);

      // Save draft using REST API with authentication
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/auctions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(idToken && { 'Authorization': `Bearer ${idToken}` })
        },
        body: JSON.stringify(auctionData)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to save draft: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const result = await response.json();
      console.log("Draft saved successfully:", result);

      // 🔥 FIXED: Use the same user ID as AuctionGrid
      import('../services/notificationService').then(({ notificationService }) => {
        notificationService.addNotification({
          userId: auctionGridUserId, // Use the same ID as AuctionGrid
          type: 'BID_CONFIRMED',
          title: 'Draft Saved',
          message: `Your auction draft "${formData.title}" has been saved.`,
          relatedId: result.id || result.auctionId,
          metadata: {
            auctionTitle: formData.title,
            status: 'draft'
          }
        });
      });

      // FIXED: Redirect to the draft auction or dashboard
      if (result.id) {
        navigate(`/auction/${result.id}`);
      } else if (result.auctionId) {
        navigate(`/auction/${result.auctionId}`);
      } else {
        navigate("/dashboard");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save draft");
      console.error("Error saving draft:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    // FIXED: Added the exact same gradient background as FeatureSection
    <div className="min-h-screen bg-gradient-to-br from-gray-300 to-gray-500">
      <Header />
      
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* FIXED: Added glass effect header matching FeatureSection */}
        <div className="mb-8">
          <div className="group hover:shadow-2xl transition-all duration-300 backdrop-blur-xl bg-white/20 border border-white/30 rounded-xl shadow-xl p-8">
            <h1 className="font-playfair text-3xl font-bold mb-2">List Your Artwork</h1>
            <p className="text-gray-800">Share your art with local collectors and art enthusiasts</p>
          </div>
        </div>

        {error && (
          // FIXED: Glass effect error message
          <div className="mb-6 backdrop-blur-xl bg-red-50/80 border border-red-200/30 rounded-xl shadow-xl p-4">
            <p className="text-red-700">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Form */}
            <div className="lg:col-span-2 space-y-6">
              {/* Artwork Images */}
              {/* FIXED: Glass effect card matching FeatureSection */}
              <Card className="group hover:shadow-2xl transition-all duration-300 backdrop-blur-xl bg-white/20 border border-white/30 rounded-xl shadow-xl">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <ImageIcon className="w-5 h-5 mr-2" />
                    Artwork Images
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {images.map((image, index) => (
                      <div key={index} className="relative group">
                        <img 
                          src={image} 
                          alt={`Artwork ${index + 1}`}
                          className="w-full h-32 object-cover rounded-lg"
                        />
                        <Button
                          variant="destructive"
                          size="sm"
                          className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => removeImage(index)}
                          type="button"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                        {index === 0 && (
                          <Badge className="absolute bottom-2 left-2">Primary</Badge>
                        )}
                      </div>
                    ))}
                    
                    {images.length < 8 && (
                      <label className="w-full h-32 border-2 border-dashed border-white/40 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-accent transition-colors backdrop-blur-sm bg-white/10">
                        <Upload className="w-8 h-8 text-gray-700 mb-2" />
                        <span className="text-sm text-gray-700">Add Image</span>
                        <input 
                          type="file" 
                          accept="image/*" 
                          multiple 
                          className="hidden"
                          onChange={handleImageUpload}
                        />
                      </label>
                    )}
                  </div>
                  <p className="text-sm text-gray-700">
                    Upload up to 8 high-quality images. The first image will be your primary image.
                  </p>
                </CardContent>
              </Card>

              {/* Basic Information */}
              {/* FIXED: Glass effect card */}
              <Card className="group hover:shadow-2xl transition-all duration-300 backdrop-blur-xl bg-white/20 border border-white/30 rounded-xl shadow-xl">
                <CardHeader>
                  <CardTitle>Basic Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="title">Artwork Title *</Label>
                    <Input 
                      id="title" 
                      placeholder="Enter the title of your artwork"
                      value={formData.title}
                      onChange={(e) => handleInputChange('title', e.target.value)}
                      required
                      className="backdrop-blur-sm bg-white/20 border-white/30"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="description">Description *</Label>
                    <Textarea 
                      id="description" 
                      placeholder="Describe your artwork, inspiration, technique, and any other relevant details..."
                      rows={4}
                      value={formData.description}
                      onChange={(e) => handleInputChange('description', e.target.value)}
                      required
                      className="backdrop-blur-sm bg-white/20 border-white/30"
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="medium">Medium</Label>
                      <Select 
                        value={formData.medium} 
                        onValueChange={(value) => handleInputChange('medium', value)}
                      >
                        <SelectTrigger className="backdrop-blur-sm bg-white/20 border-white/30">
                          <SelectValue placeholder="Select medium" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="oil">Oil on Canvas</SelectItem>
                          <SelectItem value="acrylic">Acrylic on Canvas</SelectItem>
                          <SelectItem value="watercolor">Watercolor</SelectItem>
                          <SelectItem value="mixed">Mixed Media</SelectItem>
                          <SelectItem value="digital">Digital Art</SelectItem>
                          <SelectItem value="photography">Photography</SelectItem>
                          <SelectItem value="sculpture">Sculpture</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="year">Year Created</Label>
                      <Input 
                        id="year" 
                        type="number" 
                        placeholder="2024"
                        min="1900"
                        max="2030"
                        value={formData.year}
                        onChange={(e) => handleInputChange('year', e.target.value)}
                        className="backdrop-blur-sm bg-white/20 border-white/30"
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Dimensions</Label>
                    <div className="flex items-center gap-2 mb-2">
                      <Ruler className="w-4 h-4 text-gray-700" />
                      <Select 
                        value={formData.dimensionUnit} 
                        onValueChange={(value) => handleInputChange('dimensionUnit', value)}
                      >
                        <SelectTrigger className="w-32 backdrop-blur-sm bg-white/20 border-white/30">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="cm">Centimeters</SelectItem>
                          <SelectItem value="in">Inches</SelectItem>
                          <SelectItem value="mm">Millimeters</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="width">Width</Label>
                        <Input 
                          id="width" 
                          type="number" 
                          placeholder="60"
                          value={formData.dimensions.width}
                          onChange={(e) => handleDimensionChange('width', e.target.value)}
                          className="backdrop-blur-sm bg-white/20 border-white/30"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="height">Height</Label>
                        <Input 
                          id="height" 
                          type="number" 
                          placeholder="80"
                          value={formData.dimensions.height}
                          onChange={(e) => handleDimensionChange('height', e.target.value)}
                          className="backdrop-blur-sm bg-white/20 border-white/30"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="depth">Depth</Label>
                        <Input 
                          id="depth" 
                          type="number" 
                          placeholder="2"
                          value={formData.dimensions.depth}
                          onChange={(e) => handleDimensionChange('depth', e.target.value)}
                          className="backdrop-blur-sm bg-white/20 border-white/30"
                        />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Auction Details */}
              {/* FIXED: Glass effect card */}
              <Card className="group hover:shadow-2xl transition-all duration-300 backdrop-blur-xl bg-white/20 border border-white/30 rounded-xl shadow-xl">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Calendar className="w-5 h-5 mr-2" />
                    Auction Details
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="startingBid">Starting Bid (R) *</Label>
                      <Input 
                        id="startingBid" 
                        type="number" 
                        placeholder="500"
                        min="1"
                        value={formData.startingBid}
                        onChange={(e) => handleInputChange('startingBid', e.target.value)}
                        required
                        className="backdrop-blur-sm bg-white/20 border-white/30"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="reservePrice">Reserve Price (R)</Label>
                      <Input 
                        id="reservePrice" 
                        type="number" 
                        placeholder="1000"
                        value={formData.reservePrice}
                        onChange={(e) => handleInputChange('reservePrice', e.target.value)}
                        className="backdrop-blur-sm bg-white/20 border-white/30"
                      />
                      <p className="text-xs text-gray-700">Minimum price you'll accept (optional)</p>
                    </div>
                  </div>
                  
                  {/* FIXED: Date inputs with proper mobile sizing */}
                  <div className="grid grid-cols-2 gap-3 sm:gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="startDate">Auction Start *</Label>
                      <Input 
                        id="startDate" 
                        type="datetime-local"
                        value={formData.startDate}
                        onChange={(e) => handleInputChange('startDate', e.target.value)}
                        required
                        className="backdrop-blur-sm bg-white/20 border-white/30 text-sm sm:text-base"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="endDate">Auction End *</Label>
                      <Input 
                        id="endDate" 
                        type="datetime-local"
                        value={formData.endDate}
                        onChange={(e) => handleInputChange('endDate', e.target.value)}
                        required
                        className="backdrop-blur-sm bg-white/20 border-white/30 text-sm sm:text-base"
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="bidIncrement">Bid Increment (R)</Label>
                    <Select 
                      value={formData.bidIncrement} 
                      onValueChange={(value) => handleInputChange('bidIncrement', value)}
                    >
                      <SelectTrigger className="backdrop-blur-sm bg-white/20 border-white/30">
                        <SelectValue placeholder="Select bid increment" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="25">R25</SelectItem>
                        <SelectItem value="50">R50</SelectItem>
                        <SelectItem value="100">R100</SelectItem>
                        <SelectItem value="250">R250</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>

              {/* Location & Shipping */}
              {/* FIXED: Glass effect card */}
              <Card className="group hover:shadow-2xl transition-all duration-300 backdrop-blur-xl bg-white/20 border border-white/30 rounded-xl shadow-xl">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <MapPin className="w-5 h-5 mr-2" />
                    Location & Shipping
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="location">Artwork Location</Label>
                    <div className="flex gap-2">
                      <Input 
                        id="location" 
                        placeholder="Bloemfontein, SA"
                        value={formData.location}
                        onChange={(e) => handleInputChange('location', e.target.value)}
                        className="backdrop-blur-sm bg-white/20 border-white/30"
                      />
                      {userLocation && (
                        <Button 
                          type="button" 
                          variant="outline" 
                          size="icon"
                          onClick={useDetectedLocation}
                          title="Use my current location"
                          className="backdrop-blur-sm bg-white/20 border-white/30"
                        >
                          <MapPin className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                    {userLocation && (
                      <p className="text-xs text-gray-700">
                        Detected location: {userLocation}
                      </p>
                    )}
                    <p className="text-xs text-gray-700">
                      This helps local buyers find your artwork
                    </p>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Shipping Options</Label>
                    <div className="space-y-2">
                      <label className="flex items-center space-x-2">
                        <input 
                          type="checkbox" 
                          className="rounded backdrop-blur-sm bg-white/20 border-white/30" 
                          checked={formData.shippingOptions.localPickup}
                          onChange={(e) => handleShippingOptionChange('localPickup', e.target.checked)}
                        />
                        <span className="text-sm text-gray-800">Local pickup available</span>
                      </label>
                      <label className="flex items-center space-x-2">
                        <input 
                          type="checkbox" 
                          className="rounded backdrop-blur-sm bg-white/20 border-white/30" 
                          checked={formData.shippingOptions.shippingAvailable}
                          onChange={(e) => handleShippingOptionChange('shippingAvailable', e.target.checked)}
                        />
                        <span className="text-sm text-gray-800">Shipping available</span>
                      </label>
                    </div>
                  </div>
                  
                  {formData.shippingOptions.shippingAvailable && (
                    <div className="space-y-2">
                      <Label htmlFor="shippingCost">Shipping Cost (R)</Label>
                      <Input 
                        id="shippingCost" 
                        type="number" 
                        placeholder="50"
                        value={formData.shippingCost}
                        onChange={(e) => handleInputChange('shippingCost', e.target.value)}
                        className="backdrop-blur-sm bg-white/20 border-white/30"
                      />
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Preview & Summary */}
            <div className="space-y-6">
              {/* FIXED: Glass effect card */}
              <Card className="group hover:shadow-2xl transition-all duration-300 backdrop-blur-xl bg-white/20 border border-white/30 rounded-xl shadow-xl">
                <CardHeader>
                  <CardTitle>Preview</CardTitle>
                </CardHeader>
                <CardContent>
                  {images.length > 0 ? (
                    <img 
                      src={images[0]} 
                      alt="Artwork preview"
                      className="w-full h-48 object-cover rounded-lg"
                    />
                  ) : (
                    <div className="w-full h-48 bg-white/20 rounded-lg flex items-center justify-center backdrop-blur-sm">
                      <ImageIcon className="w-12 h-12 text-gray-700" />
                    </div>
                  )}
                  <div className="mt-4 space-y-2">
                    <h3 className="font-semibold text-gray-800">{formData.title || "Artwork Title"}</h3>
                    <p className="text-sm text-gray-700">
                      by {getUserDisplayName()}
                    </p>
                    <p className="text-lg font-bold text-accent">
                      Starting at R{formData.startingBid || "500"}
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* FIXED: Glass effect card */}
              <Card className="group hover:shadow-2xl transition-all duration-300 backdrop-blur-xl bg-white/20 border border-white/30 rounded-xl shadow-xl">
                <CardHeader>
                  <CardTitle>Listing Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between text-sm text-gray-800">
                    <span>Platform Fee</span>
                    <span>5% of final price</span>
                  </div>
                  <div className="flex justify-between text-sm text-gray-800">
                    <span>Payment Processing</span>
                    <span>2.9% + R2</span>
                  </div>
                  <div className="border-t border-white/30 pt-2">
                    <div className="flex justify-between font-semibold text-gray-800">
                      <span>You'll receive</span>
                      <span>~92% of final price</span>
                    </div>
                  </div>
                  <div className="text-xs text-gray-700 mt-2">
                    <p>Example for R1,000 sale:</p>
                    <p>• Platform fee: R50</p>
                    <p>• Payment processing: R31</p>
                    <p>• You receive: R919</p>
                  </div>
                </CardContent>
              </Card>

              <div className="space-y-3">
                <Button 
                  type="submit" 
                  className="w-full btn-primary backdrop-blur-sm bg-white/20 border-white/30 hover:shadow-2xl transition-all duration-300"
                  disabled={loading}
                >
                  {loading ? "Publishing..." : "Publish Auction"}
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  className="w-full backdrop-blur-sm bg-white/20 border-white/30 hover:shadow-2xl transition-all duration-300"
                  onClick={handleSaveDraft}
                  disabled={loading}
                >
                  {loading ? "Saving..." : "Save as Draft"}
                </Button>
              </div>

              {/* FIXED: Glass effect card */}
              <Card className="group hover:shadow-2xl transition-all duration-300 backdrop-blur-xl bg-white/20 border border-white/30 rounded-xl shadow-xl">
                <CardContent className="p-4">
                  <h4 className="font-semibold mb-2 text-gray-800">Tips for Success</h4>
                  <ul className="text-sm text-gray-700 space-y-1">
                    <li>• Use high-quality, well-lit photos</li>
                    <li>• Write detailed descriptions</li>
                    <li>• Set competitive starting prices</li>
                    <li>• Respond quickly to buyer questions</li>
                  </ul>
                </CardContent>
              </Card>
            </div>
          </div>
        </form>
      </div>

      <Footer />
    </div>
  );
};

export default CreateAuction;