import { useState } from 'react';
import { Share, Download, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { QRCodeSVG } from 'qrcode.react';

interface ShareProfileButtonProps {
  artistId: string;
  artistName: string;
}

export const ShareProfileButton = ({ artistId, artistName }: ShareProfileButtonProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const profileUrl = `${window.location.origin}/artist/${artistId}`;

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(profileUrl);
      alert('Profile link copied to clipboard!');
    } catch (err) {
      console.error('Failed to copy: ', err);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="flex items-center gap-2 backdrop-blur-xl bg-white/20 border border-white/30">
          <Share className="w-4 h-4" />
          Share Profile
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md backdrop-blur-xl bg-white/20 border border-white/30">
        <DialogHeader>
          <DialogTitle>Share Artist Profile</DialogTitle>
          <DialogDescription>
            Share {artistName}'s profile with collectors
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex flex-col items-center space-y-4 p-4">
          {/* QR Code with Gradient Effect */}
          <div className="p-6 rounded-2xl backdrop-blur-xl bg-white/20 border border-white/30 shadow-xl">
            <div className="relative">
              <QRCodeSVG
                value={profileUrl}
                size={200}
                level="H"
                includeMargin={false}
                bgColor="transparent"
                fgColor="url(#gradient)"
                style={{ 
                  width: '100%', 
                  height: '100%',
                  filter: 'drop-shadow(0 4px 12px rgba(0, 0, 0, 0.1))'
                }}
              />
              {/* SVG Gradient Definition */}
              <svg width="0" height="0">
                <defs>
                  <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#667eea" />
                    <stop offset="50%" stopColor="#764ba2" />
                    <stop offset="100%" stopColor="#f093fb" />
                  </linearGradient>
                </defs>
              </svg>
            </div>
          </div>
          
          {/* Action Buttons */}
          <div className="flex gap-3 w-full">
            <Button 
              onClick={copyToClipboard} 
              className="flex-1 flex items-center gap-2 backdrop-blur-xl bg-white/20 border border-white/30"
            >
              <Copy className="w-4 h-4" />
              Copy Link
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};