import { MapPin, Zap, Shield, Users, Palette, Timer } from "lucide-react";
import { Card, CardContent } from "./ui/card";

const features = [
  {
    icon: MapPin,
    title: "Location-Aware Discovery",
    description: "Find artwork and auctions happening near you. Support local artists and discover hidden gems in your neighborhood."
  },
  {
    icon: Zap,
    title: "Real-Time Bidding",
    description: "Experience the excitement of live auctions with real-time updates, instant notifications, and seamless bidding."
  },
  {
    icon: Shield,
    title: "Secure Transactions",
    description: "Bid with confidence knowing all transactions are secure and protected. Your payments and personal data are safe."
  },
  {
    icon: Users,
    title: "Artist Community",
    description: "Connect directly with local artists, learn their stories, and support the creative community in your area."
  },
  {
    icon: Palette,
    title: "Curated Collections",
    description: "Discover carefully selected artwork across various styles, mediums, and price ranges to match your taste."
  },
  {
    icon: Timer,
    title: "Smart Notifications",
    description: "Never miss an auction with intelligent alerts for ending auctions, outbid notifications, and new listings."
  }
];

export const FeatureSection = () => {
  return (
    <section className="py-20 bg-gradient-to-br from-gray-300 to-gray-500">
      <div className="container px-4">
        <div className="text-center mb-16">
          <h2 className="font-playfair text-4xl font-bold mb-4 text-gradient">
            Why Choose ArtBurst?
          </h2>
          <p className="text-lg text-gray-800 max-w-3xl mx-auto">
            We're revolutionizing how art lovers discover and collect local artwork. 
            Our platform brings together the excitement of auctions with the convenience 
            of modern technology.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <Card 
              key={index} 
              className="group hover:shadow-2xl transition-all duration-300 backdrop-blur-xl bg-white/20 border border-white/30 rounded-xl shadow-xl"
            >
              <CardContent className="p-8">
                <div className="w-12 h-12 bg-gradient-to-r from-purple-500/20 to-blue-500/20 rounded-lg flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300 border border-white/20">
                  <feature.icon className="w-6 h-6 text-gradient" />
                </div>
                <h3 className="font-playfair text-xl font-semibold mb-3 text-gray-800">
                  {feature.title}
                </h3>
                <p className="text-gray-700 leading-relaxed">
                  {feature.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};