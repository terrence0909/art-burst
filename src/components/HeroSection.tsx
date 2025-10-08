import { MapPin, Zap, Users } from "lucide-react";
import { Button } from "./ui/button";
import heroImage from "@/assets/art-burst.jpg";
import { useNavigate } from "react-router-dom";

export const HeroSection = () => {
  const navigate = useNavigate();

  return (
    <section
      className="relative min-h-[80vh] flex items-center justify-center overflow-hidden"
      aria-label="Hero section showcasing local art auctions"
    >
      {/* Background Image */}
      <img 
        src={heroImage} 
        alt="" 
        className="absolute inset-0 w-full h-full object-cover"
      />
      
      {/* Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/40 to-transparent" />
      
      {/* Main Content */}
      <div className="relative z-10 container px-4 text-white">
        <div className="max-w-2xl">
          <h1 className="font-playfair text-5xl md:text-7xl font-bold mb-6 leading-tight">
            Discover Local
            <span className="block text-gradient">Art Auctions</span>
          </h1>

          <p className="text-xl md:text-2xl mb-8 text-white/90 font-light">
            Connect with talented artists in your area. Bid on unique artwork
            and support your local creative community.
          </p>

          {/* Feature Badges */}
          <div className="flex flex-wrap gap-4 mb-8">
            <div className="flex items-center space-x-2 bg-white/10 backdrop-blur px-4 py-2 rounded-full">
              <Zap className="w-5 h-5 text-gold" aria-hidden="true" />
              <span className="text-sm font-medium">Real-time Bidding</span>
            </div>
            <div className="flex items-center space-x-2 bg-white/10 backdrop-blur px-4 py-2 rounded-full">
              <MapPin className="w-5 h-5 text-gold" aria-hidden="true" />
              <span className="text-sm font-medium">Location-based Discovery</span>
            </div>
            <div className="flex items-center space-x-2 bg-white/10 backdrop-blur px-4 py-2 rounded-full">
              <Users className="w-5 h-5 text-gold" aria-hidden="true" />
              <span className="text-sm font-medium">Local Artists</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4">
            <Button
              size="lg"
              className="btn-auction"
              onClick={() => navigate("/browse")} 
            >
              Explore Auctions
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="bg-white/10 backdrop-blur border-white/20 text-white hover:bg-white/20"
              onClick={() => navigate("/create")}
            >
              Become an Artist
            </Button>
          </div>
        </div>
      </div>

      {/* Floating Stats */}
      <div className="absolute bottom-8 right-8 hidden lg:block">
        <div className="bg-white/10 backdrop-blur rounded-lg p-6 text-white shadow-lg">
          <div className="grid grid-cols-3 gap-6 text-center">
            <div>
              <div className="text-2xl font-bold text-gold">26</div>
              <div className="text-xs text-white/70">Active Auctions</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-gold">105</div>
              <div className="text-xs text-white/70">Local Artists</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-gold">R95k</div>
              <div className="text-xs text-white/70">Total Sales</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};