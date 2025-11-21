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
  startingBid?: number;
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
    navigate(`/create?draftId=${draftId}`);
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
      <div className="min-h-screen bg-white">
        <Header />
        <div className="container mx-auto px-4 py-16">
          <div className="flex justify-center items-center min-h-[400px]">
            <div className="animate-spin h-16 w-16 border-b-2 border-gray-300 rounded-full"></div>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <Header />
      
      <div className="container mx-auto px-4 py-16 max-w-6xl">
        <div className="mb-12">
          <h1 className="text-4xl font-bold mb-2 text-gray-900">My Drafts</h1>
          <p className="text-gray-600">Manage your unsaved auctions. Edit, publish, or delete them here.</p>
        </div>

        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-700">{error}</p>
          </div>
        )}

        {drafts.length === 0 ? (
          <Card className="border border-gray-200">
            <CardContent className="p-12 text-center">
              <p className="text-xl text-gray-700 mb-4">No drafts yet</p>
              <p className="text-gray-600 mb-8">Start creating an auction and save it as a draft to see it here.</p>
              <Button 
                onClick={() => navigate('/create')}
                className="bg-black text-white hover:bg-gray-800"
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
                className="border border-gray-200 hover:border-gray-300 transition-colors overflow-hidden"
              >
                {draft.image && (
                  <div className="h-48 overflow-hidden bg-gray-100">
                    <img 
                      src={draft.image} 
                      alt={draft.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
                
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-3">
                    <CardTitle className="text-lg text-gray-900 line-clamp-2">{draft.title}</CardTitle>
                    <Badge variant="outline" className="text-gray-600 border-gray-300 flex-shrink-0">Draft</Badge>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  {draft.startingBid && (
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Starting Bid</p>
                      <p className="text-xl font-semibold text-gray-900">R{(draft.startingBid || 0).toLocaleString()}</p>
                    </div>
                  )}

                  <div>
                    <p className="text-sm text-gray-600 mb-1">Last Updated</p>
                    <p className="text-sm text-gray-700">
                      {new Date(draft.updatedAt).toLocaleDateString()} at {new Date(draft.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>

                  <div className="border-t border-gray-200 pt-4 space-y-2">
                    <Button 
                      onClick={() => handleEdit(draft.auctionId)}
                      variant="outline"
                      className="w-full border-gray-300 text-gray-700 hover:bg-gray-50"
                    >
                      <Edit className="w-4 h-4 mr-2" />
                      Edit
                    </Button>

                    <Button 
                      onClick={() => handlePublish(draft)}
                      className="w-full bg-black text-white hover:bg-gray-800"
                    >
                      <Send className="w-4 h-4 mr-2" />
                      Publish
                    </Button>

                    <Button 
                      onClick={() => handleDelete(draft.auctionId, draft.title)}
                      variant="outline"
                      className="w-full border-gray-300 text-red-600 hover:bg-red-50"
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
