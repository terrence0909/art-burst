import { Header } from "@/components/Header";
import { HeroSection } from "@/components/HeroSection";
import { AuctionGrid } from "@/components/AuctionGrid";
import { FeatureSection } from "@/components/FeatureSection";
import { Footer } from "@/components/Footer";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <HeroSection />
      <AuctionGrid />
      <FeatureSection />
      <Footer />
    </div>
  );
};

export default Index;
