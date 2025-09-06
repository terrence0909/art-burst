import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Upload, X, MapPin, Calendar, DollarSign, Image as ImageIcon } from "lucide-react";
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
import { getCurrentUser, fetchAuthSession } from "aws-amplify/auth";
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

interface AuctionItem {
  id: string;
  title: string;
  description: string;
  medium: string;
  year: string;
  dimensions: {
    width: string;
    height: string;
    depth: string;
  };
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

  // Debug environment variables
  useEffect(() => {
    console.log('API Base URL:', import.meta.env.VITE_API_BASE_URL);
    console.log('S3 Bucket:', import.meta.env.VITE_S3_BUCKET);
    console.log('AWS Region:', import.meta.env.VITE_AWS_REGION);
  }, []);

  // Test S3 upload function
  const testS3Upload = async () => {
    try {
      const testFile = new File(['test'], 'test.txt', { type: 'text/plain' });
      const result = await uploadData({
        key: `test/${Date.now()}_test.txt`,
        data: testFile,
      }).result;
      console.log('✅ S3 upload successful:', result);
      return true;
    } catch (error) {
      console.error('❌ S3 upload failed:', error);
      return false;
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
      
      // Prepare auction data
      const auctionData = {
        title: formData.title,
        description: formData.description,
        medium: formData.medium,
        year: formData.year,
        dimensions: {
          width: parseFloat(formData.dimensions.width) || 0,
          height: parseFloat(formData.dimensions.height) || 0,
          depth: parseFloat(formData.dimensions.depth) || 0
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
        artistName: user.username || "Unknown Artist",
        status: "active" as const,
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
      
      const auctionData = {
        title: formData.title,
        description: formData.description,
        medium: formData.medium,
        year: formData.year,
        dimensions: {
          width: parseFloat(formData.dimensions.width) || 0,
          height: parseFloat(formData.dimensions.height) || 0,
          depth: parseFloat(formData.dimensions.depth) || 0
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
    <div className="min-h-screen bg-background">
      <Header />
      
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="mb-8">
          <h1 className="font-playfair text-3xl font-bold mb-2">List Your Artwork</h1>
          <p className="text-muted-foreground">Share your art with local collectors and art enthusiasts</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-700">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Form */}
            <div className="lg:col-span-2 space-y-6">
              {/* Artwork Images */}
              <Card>
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
                      <label className="w-full h-32 border-2 border-dashed border-muted-foreground/25 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-accent transition-colors">
                        <Upload className="w-8 h-8 text-muted-foreground mb-2" />
                        <span className="text-sm text-muted-foreground">Add Image</span>
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
                  <p className="text-sm text-muted-foreground">
                    Upload up to 8 high-quality images. The first image will be your primary image.
                  </p>
                </CardContent>
              </Card>

              {/* Basic Information */}
              <Card>
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
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="medium">Medium</Label>
                      <Select 
                        value={formData.medium} 
                        onValueChange={(value) => handleInputChange('medium', value)}
                      >
                        <SelectTrigger>
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
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="width">Width (inches)</Label>
                      <Input 
                        id="width" 
                        type="number" 
                        placeholder="24"
                        value={formData.dimensions.width}
                        onChange={(e) => handleDimensionChange('width', e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="height">Height (inches)</Label>
                      <Input 
                        id="height" 
                        type="number" 
                        placeholder="36"
                        value={formData.dimensions.height}
                        onChange={(e) => handleDimensionChange('height', e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="depth">Depth (inches)</Label>
                      <Input 
                        id="depth" 
                        type="number" 
                        placeholder="1.5"
                        value={formData.dimensions.depth}
                        onChange={(e) => handleDimensionChange('depth', e.target.value)}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Auction Details */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <DollarSign className="w-5 h-5 mr-2" />
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
                      />
                      <p className="text-xs text-muted-foreground">Minimum price you'll accept (optional)</p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="startDate">Auction Start *</Label>
                      <Input 
                        id="startDate" 
                        type="datetime-local"
                        value={formData.startDate}
                        onChange={(e) => handleInputChange('startDate', e.target.value)}
                        required
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
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="bidIncrement">Bid Increment (R)</Label>
                    <Select 
                      value={formData.bidIncrement} 
                      onValueChange={(value) => handleInputChange('bidIncrement', value)}
                    >
                      <SelectTrigger>
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
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <MapPin className="w-5 h-5 mr-2" />
                    Location & Shipping
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="location">Artwork Location</Label>
                    <Input 
                      id="location" 
                      placeholder="Bloemfontein, SA"
                      value={formData.location}
                      onChange={(e) => handleInputChange('location', e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                      This helps local buyers find your artwork
                    </p>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Shipping Options</Label>
                    <div className="space-y-2">
                      <label className="flex items-center space-x-2">
                        <input 
                          type="checkbox" 
                          className="rounded" 
                          checked={formData.shippingOptions.localPickup}
                          onChange={(e) => handleShippingOptionChange('localPickup', e.target.checked)}
                        />
                        <span className="text-sm">Local pickup available</span>
                      </label>
                      <label className="flex items-center space-x-2">
                        <input 
                          type="checkbox" 
                          className="rounded" 
                          checked={formData.shippingOptions.shippingAvailable}
                          onChange={(e) => handleShippingOptionChange('shippingAvailable', e.target.checked)}
                        />
                        <span className="text-sm">Shipping available</span>
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
                      />
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Preview & Summary */}
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Preview</CardTitle>
                </CardHeader>
                <CardContent>
                  {images.length > 0 ? (
                    <img 
                      src={images[0]} 
                      alt="Artwork preview"
                      className="w-full h-48 object-cover rounded-lg frame-luxury"
                    />
                  ) : (
                    <div className="w-full h-48 bg-muted rounded-lg flex items-center justify-center">
                      <ImageIcon className="w-12 h-12 text-muted-foreground" />
                    </div>
                  )}
                  <div className="mt-4 space-y-2">
                    <h3 className="font-semibold">{formData.title || "Artwork Title"}</h3>
                    <p className="text-sm text-muted-foreground">
                      by {"Your Name"}
                    </p>
                    <p className="text-lg font-bold text-accent">
                      Starting at R{formData.startingBid || "500"}
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Listing Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span>Listing Fee</span>
                    <span>R0</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Success Fee</span>
                    <span>5% of final price</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Payment Processing</span>
                    <span>2.9% + R0.30</span>
                  </div>
                  <div className="border-t pt-2">
                    <div className="flex justify-between font-semibold">
                      <span>You'll receive</span>
                      <span>~92% of final price</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="space-y-3">
                <Button 
                  type="submit" 
                  className="w-full btn-primary"
                  disabled={loading}
                >
                  {loading ? "Publishing..." : "Publish Auction"}
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  className="w-full"
                  onClick={handleSaveDraft}
                  disabled={loading}
                >
                  {loading ? "Saving..." : "Save as Draft"}
                </Button>
                
                {/* Test button for debugging */}
                <Button 
                  type="button" 
                  variant="secondary" 
                  className="w-full"
                  onClick={testS3Upload}
                  disabled={loading}
                >
                  Test S3 Connection
                </Button>
              </div>

              <Card>
                <CardContent className="p-4">
                  <h4 className="font-semibold mb-2">Tips for Success</h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
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