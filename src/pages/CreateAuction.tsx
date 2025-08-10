import { useState } from "react";
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

const CreateAuction = () => {
  const [images, setImages] = useState<string[]>([]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      // In a real app, you'd upload to a server and get URLs back
      Array.from(files).forEach(file => {
        const reader = new FileReader();
        reader.onload = (e) => {
          setImages(prev => [...prev, e.target?.result as string]);
        };
        reader.readAsDataURL(file);
      });
    }
  };

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="mb-8">
          <h1 className="font-playfair text-3xl font-bold mb-2">List Your Artwork</h1>
          <p className="text-muted-foreground">Share your art with local collectors and art enthusiasts</p>
        </div>

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
                      >
                        <X className="w-4 h-4" />
                      </Button>
                      {index === 0 && (
                        <Badge className="absolute bottom-2 left-2">Primary</Badge>
                      )}
                    </div>
                  ))}
                  
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
                  <Label htmlFor="title">Artwork Title</Label>
                  <Input 
                    id="title" 
                    placeholder="Enter the title of your artwork"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea 
                    id="description" 
                    placeholder="Describe your artwork, inspiration, technique, and any other relevant details..."
                    rows={4}
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="medium">Medium</Label>
                    <Select>
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
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="height">Height (inches)</Label>
                    <Input 
                      id="height" 
                      type="number" 
                      placeholder="36"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="depth">Depth (inches)</Label>
                    <Input 
                      id="depth" 
                      type="number" 
                      placeholder="1.5"
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
                    <Label htmlFor="startingBid">Starting Bid (R)</Label>
                    <Input 
                      id="startingBid" 
                      type="number" 
                      placeholder="500"
                      min="1"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="reservePrice">Reserve Price (R)</Label>
                    <Input 
                      id="reservePrice" 
                      type="number" 
                      placeholder="1000"
                    />
                    <p className="text-xs text-muted-foreground">Minimum price you'll accept (optional)</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="startDate">Auction Start</Label>
                    <Input 
                      id="startDate" 
                      type="datetime-local"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="endDate">Auction End</Label>
                    <Input 
                      id="endDate" 
                      type="datetime-local"
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="bidIncrement">Bid Increment (R)</Label>
                  <Select>
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
                  />
                  <p className="text-xs text-muted-foreground">
                    This helps local buyers find your artwork
                  </p>
                </div>
                
                <div className="space-y-2">
                  <Label>Shipping Options</Label>
                  <div className="space-y-2">
                    <label className="flex items-center space-x-2">
                      <input type="checkbox" className="rounded" />
                      <span className="text-sm">Local pickup available</span>
                    </label>
                    <label className="flex items-center space-x-2">
                      <input type="checkbox" className="rounded" />
                      <span className="text-sm">Shipping available</span>
                    </label>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="shippingCost">Shipping Cost (R)</Label>
                  <Input 
                    id="shippingCost" 
                    type="number" 
                    placeholder="50"
                  />
                </div>
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
                  <h3 className="font-semibold">Artwork Title</h3>
                  <p className="text-sm text-muted-foreground">by Your Name</p>
                  <p className="text-lg font-bold text-accent">Starting at R500</p>
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
              <Button className="w-full btn-primary">
                Publish Auction
              </Button>
              <Button variant="outline" className="w-full">
                Save as Draft
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
      </div>

      <Footer />
    </div>
  );
};

export default CreateAuction;