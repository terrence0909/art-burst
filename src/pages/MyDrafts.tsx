import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Trash2, Edit, Send } from "lucide-react";
import { fetchAuthSession } from "aws-amplify/auth";

interface Draft {
  auctionId: string;
  title: string;
  description: string;
  image?: string;
  startingBid: number;
  createdAt: string;
  updatedAt: string;
  status: string;
}

export const MyDrafts = () => {
  const navigate = useNavigate();
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

  useEffect(() => {
    fetchDrafts();
  }, []);

  const fetchDrafts = async () => {
    try {
      setLoading(true);
      setError(null);

      const session = await fetchAuthSession();
      const idToken = session.tokens?.idToken?.toString();

      const response = await fetch(`${API_BASE_URL}/auctions`, {
        headers: {
          'Content-Type': 'application/json',
          ...(idToken && { 'Authorization': `Bearer ${idToken}` }),
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch drafts');
      }

      const allAuctions = await response.json();
      const userDrafts = allAuctions.filter((auction: any) => 
        auction.status === 'draft'
      );

      setDrafts(userDrafts);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch drafts');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (draftId: string) => {
    navigate(`/create-auction?draftId=${draftId}`);
  };

  const handlePublish = async (draft: Draft) => {
    try {
      const session = await fetchAuthSession();
      const idToken = session.tokens?.idToken?.toString();

      const response = await fetch(`${API_BASE_URL}/auctions/${draft.auctionId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(idToken && { 'Authorization': `Bearer ${idToken}` }),
        },
        body: JSON.stringify({
          ...draft,
          status: new Date(draft.createdAt) > new Date() ? 'upcoming' : 'active',
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to publish auction');
      }

      setDrafts(drafts.filter(d => d.auctionId !== draft.auctionId));
      alert('✅ Auction published successfully!');
    } catch (err) {
      alert('❌ Failed to publish: ' + (err instanceof Error ? err.message : 'Unknown error'));
    }
  };

  const handleDelete = async (draftId: string, draftTitle: string) => {
    if (!confirm(`Delete draft "${draftTitle}"?`)) return;

    try {
      const session = await fetchAuthSession();
      const idToken = session.tokens?.idToken?.toString();

      const response = await fetch(`${API_BASE_URL}/auctions/${draftId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          ...(idToken && { 'Authorization': `Bearer ${idToken}` }),
        },
      });

      if (!response.ok) {
        throw new Error('Failed to delete draft');
      }

      setDrafts(drafts.filter(d => d.auctionId !== draftId));
      alert('✅ Draft deleted');
    } catch (err) {
      alert('❌ Failed to delete: ' + (err instanceof Error ? err.message : 'Unknown error'));
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-300 to-gray-500">
        <Header />
        <div className="container mx-auto px-4 py-16">
          <div className="flex justify-center items-center min-h-[400px]">
            <div className="animate-spin h-16 w-16 border-b-2 border-primary rounded-full"></div>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-300 to-gray-500">
      <Header />
      
      <div className="container mx-auto px-4 py-16 max-w-6xl">
        <div className="mb-8">
          <div className="group hover:shadow-2xl transition-all duration-300 backdrop-blur-xl bg-white/20 border border-white/30 rounded-xl shadow-xl p-8">
            <h1 className="font-playfair text-3xl font-bold mb-2">My Drafts</h1>
            <p className="text-gray-800">Manage your auction drafts. Edit, publish, or delete them here.</p>
          </div>
        </div>

        {error && (
          <div className="mb-6 backdrop-blur-xl bg-red-50/80 border border-red-200/30 rounded-xl shadow-xl p-4">
            <p className="text-red-700">❌ {error}</p>
          </div>
        )}

        {drafts.length === 0 ? (
          <Card className="backdrop-blur-xl bg-white/20 border border-white/30 rounded-xl shadow-xl">
            <CardContent className="p-12 text-center">
              <p className="text-xl text-gray-700 mb-4">No drafts yet</p>
              <p className="text-gray-600 mb-6">Start creating an auction and save it as a draft to see it here.</p>
              <Button 
                onClick={() => navigate('/create-auction')}
                className="btn-primary"
              >
                Create New Auction
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {drafts.map(draft => (
              <Card 
                key={draft.auctionId}
                className="backdrop-blur-xl bg-white/20 border border-white/30 rounded-xl shadow-xl hover:shadow-2xl transition-all duration-300"
              >
                {draft.image && (
                  <div className="h-48 overflow-hidden rounded-t-xl">
                    <img 
                      src={draft.image} 
                      alt={draft.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
                
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-lg">{draft.title}</CardTitle>
                    <Badge className="bg-yellow-500 text-white">DRAFT</Badge>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  <div>
                    <p className="text-sm text-gray-600">Starting Bid</p>
                    <p className="text-xl font-bold text-gradient">R{draft.startingBid.toLocaleString()}</p>
                  </div>

                  <div>
                    <p className="text-sm text-gray-600">Saved</p>
                    <p className="text-sm text-gray-700">
                      {new Date(draft.updatedAt).toLocaleDateString()} at {new Date(draft.updatedAt).toLocaleTimeString()}
                    </p>
                  </div>

                  <div className="border-t border-white/20 pt-4 space-y-2">
                    <Button 
                      onClick={() => handleEdit(draft.auctionId)}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center"
                    >
                      <Edit className="w-4 h-4 mr-2" />
                      Edit Draft
                    </Button>

                    <Button 
                      onClick={() => handlePublish(draft)}
                      className="w-full bg-green-600 hover:bg-green-700 text-white flex items-center justify-center"
                    >
                      <Send className="w-4 h-4 mr-2" />
                      Publish Now
                    </Button>

                    <Button 
                      onClick={() => handleDelete(draft.auctionId, draft.title)}
                      variant="destructive"
                      className="w-full flex items-center justify-center"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Footer />
    </div>
  );
};

export default MyDrafts;
