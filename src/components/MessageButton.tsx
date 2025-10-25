// CREATE: src/components/MessageButton.tsx
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/use-toast";
import { messagingService } from "@/api/messaging";
import { MessageModal } from "./MessageModal";
import { fetchUserAttributes } from "aws-amplify/auth";

interface MessageButtonProps {
  receiverId: string;
  receiverName: string;
  auctionId?: string;
  auctionTitle?: string;
  variant?: "default" | "outline" | "secondary";
  size?: "default" | "sm" | "lg" | "icon";
}

export const MessageButton: React.FC<MessageButtonProps> = ({
  receiverId,
  receiverName,
  auctionId,
  auctionTitle,
  variant = "default",
  size = "default"
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleMessageClick = async () => {
    if (!receiverId) {
      toast({
        title: "Error",
        description: "Cannot message this user",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    try {
      // Check if user is messaging themselves
      const currentUser = await fetchUserAttributes();
      if (currentUser.sub === receiverId) {
        toast({
          title: "Notice",
          description: "You cannot message yourself"
        });
        return;
      }

      setIsModalOpen(true);
    } catch (error) {
      console.error('Error starting message:', error);
      toast({
        title: "Error",
        description: "Failed to start conversation",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Button
        onClick={handleMessageClick}
        disabled={isLoading}
        variant={variant}
        size={size}
        className="gap-2 backdrop-blur-xl bg-white/20 border border-white/30"
      >
        {isLoading ? "Loading..." : "Message"}
      </Button>

      <MessageModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        receiverId={receiverId}
        receiverName={receiverName}
        auctionId={auctionId}
        auctionTitle={auctionTitle}
      />
    </>
  );
};