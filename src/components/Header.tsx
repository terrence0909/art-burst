import { MapPin, User, Search, Bell } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";

export const Header = () => {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between px-4">
        {/* Logo */}
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-gradient-luxury rounded-lg flex items-center justify-center">
            <span className="text-luxury-foreground font-bold text-sm">A</span>
          </div>
          <span className="font-playfair font-bold text-xl">ArtBurst</span>
        </div>

        {/* Search */}
        <div className="flex-1 max-w-md mx-8">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input 
              placeholder="Search artwork, artists, or locations..."
              className="pl-10 bg-muted/50"
            />
          </div>
        </div>

        {/* Location & Actions */}
        <div className="flex items-center space-x-4">
          <Button variant="ghost" size="sm" className="text-muted-foreground">
            <MapPin className="w-4 h-4 mr-2" />
            Bloemfontein, SA
          </Button>
          
          <Button variant="ghost" size="icon">
            <Bell className="w-4 h-4" />
          </Button>
          
          <Button variant="outline">
            <User className="w-4 h-4 mr-2" />
            Sign In
          </Button>
          
          <Button className="btn-primary">
            List Artwork
          </Button>
        </div>
      </div>
    </header>
  );
};