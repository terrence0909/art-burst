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
        <Button variant="outline" size="sm" className="flex items-center gap-2">
          <Share className="w-4 h-4" />
          Share Profile
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Share Artist Profile</DialogTitle>
          <DialogDescription>
            Share {artistName}'s profile with collectors
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex flex-col items-center space-y-4 p-4">
          {/* QR Code */}
          <div className="p-4 bg-white rounded-lg border">
            <QRCodeSVG
              value={profileUrl}
              size={200}
              level="H"
              includeMargin
              bgColor="#ffffff"
              fgColor="#7c3aed"
            />
          </div>
          
          {/* Action Buttons */}
          <div className="flex gap-3 w-full">
            <Button onClick={copyToClipboard} className="flex-1 flex items-center gap-2">
              <Copy className="w-4 h-4" />
              Copy Link
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};