import { MapPin, Mail, Phone } from "lucide-react";

export const Footer = () => {
  return (
    <footer className="bg-primary text-primary-foreground py-16">
      <div className="container px-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gold rounded-lg flex items-center justify-center">
                <span className="text-gold-foreground font-bold text-sm">A</span>
              </div>
              <span className="font-playfair font-bold text-xl">ArtBurst</span>
            </div>
            <p className="text-primary-foreground/80 text-sm leading-relaxed">
              Connecting local artists with art enthusiasts through location-aware 
              auctions and real-time bidding experiences.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-semibold mb-4">Quick Links</h4>
            <ul className="space-y-2 text-sm">
              <li><a href="#" className="text-primary-foreground/80 hover:text-primary-foreground transition-colors">Browse Auctions</a></li>
              <li><a href="#" className="text-primary-foreground/80 hover:text-primary-foreground transition-colors">Find Artists</a></li>
              <li><a href="#" className="text-primary-foreground/80 hover:text-primary-foreground transition-colors">How It Works</a></li>
              <li><a href="#" className="text-primary-foreground/80 hover:text-primary-foreground transition-colors">Pricing</a></li>
            </ul>
          </div>

          {/* For Artists */}
          <div>
            <h4 className="font-semibold mb-4">For Artists</h4>
            <ul className="space-y-2 text-sm">
              <li><a href="#" className="text-primary-foreground/80 hover:text-primary-foreground transition-colors">List Your Art</a></li>
              <li><a href="#" className="text-primary-foreground/80 hover:text-primary-foreground transition-colors">Artist Guidelines</a></li>
              <li><a href="#" className="text-primary-foreground/80 hover:text-primary-foreground transition-colors">Success Stories</a></li>
              <li><a href="#" className="text-primary-foreground/80 hover:text-primary-foreground transition-colors">Resources</a></li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="font-semibold mb-4">Contact</h4>
            <div className="space-y-3 text-sm">
              <div className="flex items-center space-x-2">
                <Mail className="w-4 h-4" />
                <span className="text-primary-foreground/80">tshepo@artburst.com</span>
              </div>
              <div className="flex items-center space-x-2">
                <Phone className="w-4 h-4" />
                <span className="text-primary-foreground/80">(+27) 7676 72663</span>
              </div>
              <div className="flex items-center space-x-2">
                <MapPin className="w-4 h-4" />
                <span className="text-primary-foreground/80">Bloemfontein, SA</span>
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-primary-foreground/20 mt-12 pt-8 text-center text-sm text-primary-foreground/60">
          <p>&copy; 2025 ArtBurst. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
};