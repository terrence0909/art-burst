// CREATE: src/components/MessageModal.tsx
import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Send, User } from "lucide-react";
import { messagingService, Message } from "@/api/messaging";
import { fetchUserAttributes } from "aws-amplify/auth";
import { createWebSocketService, WebSocketMessage } from "@/services/websocket";

interface MessageModalProps {
  isOpen: boolean;
  onClose: () => void;
  receiverId: string;
  receiverName: string;
  auctionId?: string;
  auctionTitle?: string;
}

export const MessageModal: React.FC<MessageModalProps> = ({
  isOpen,
  onClose,
  receiverId,
  receiverName,
  auctionId,
  auctionTitle
}) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string>("");
  const [wsService, setWsService] = useState<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && receiverId) {
      initializeConversation();
    } else {
      // Cleanup when modal closes
      if (wsService) {
        wsService.disconnect();
        setWsService(null);
      }
    }
  }, [isOpen, receiverId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const initializeConversation = async () => {
    try {
      const user = await fetchUserAttributes();
      setCurrentUserId(user.sub);

      // Start conversation and get ID
      const convId = await messagingService.startConversation(receiverId, auctionId);
      setConversationId(convId);
      
      // Load existing messages
      const existingMessages = await messagingService.getMessages(convId);
      setMessages(existingMessages);

      // Setup WebSocket for real-time messaging
      setupWebSocket(convId, user.sub);

    } catch (error) {
      console.error('Error initializing conversation:', error);
    }
  };

  const setupWebSocket = async (convId: string, userId: string) => {
    try {
      // Create WebSocket service for messaging
      const ws = createWebSocketService(`conversation-${convId}`, userId);
      await ws.connect();
      
      // Subscribe to conversation updates
      ws.subscribeToConversation(convId, (message: WebSocketMessage) => {
        if (message.type === 'NEW_MESSAGE' && message.messageData) {
          setMessages(prev => [...prev, message.messageData!]);
        }
      });

      setWsService(ws);
    } catch (error) {
      console.error('Error setting up WebSocket:', error);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !conversationId) return;

    setIsLoading(true);
    try {
      // Save message to database using your working API
      const savedMessage = await messagingService.saveMessage(
        conversationId, 
        newMessage.trim(), 
        receiverId, 
        auctionId
      );
      
      // Add the saved message to local state
      setMessages(prev => [...prev, savedMessage]);
      setNewMessage("");
      
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl h-[600px] flex flex-col backdrop-blur-xl bg-white/20 border border-white/30">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <Avatar className="w-8 h-8">
              <AvatarImage src="" />
              <AvatarFallback>
                <User className="w-4 h-4" />
              </AvatarFallback>
            </Avatar>
            <div>
              <div>Message {receiverName}</div>
              {auctionTitle && (
                <div className="text-sm text-muted-foreground font-normal">
                  About: {auctionTitle}
                </div>
              )}
            </div>
          </DialogTitle>
        </DialogHeader>

        {/* Messages Container */}
        <div className="flex-1 overflow-y-auto space-y-4 p-4">
          {messages.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              Start a conversation with {receiverName}
              {auctionTitle && ` about "${auctionTitle}"`}
            </div>
          ) : (
            messages.map((message) => (
              <div
                key={message.messageId}
                className={`flex ${message.senderId === currentUserId ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[70%] rounded-2xl p-4 ${
                    message.senderId === currentUserId
                      ? 'bg-accent text-white'
                      : 'bg-white/20 border border-white/30'
                  }`}
                >
                  <p className="text-sm">{message.content}</p>
                  <p className={`text-xs mt-1 ${
                    message.senderId === currentUserId ? 'text-white/70' : 'text-muted-foreground'
                  }`}>
                    {new Date(message.timestamp).toLocaleTimeString()}
                  </p>
                </div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="border-t border-white/30 p-4">
          <div className="flex gap-2">
            <Input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type your message..."
              disabled={isLoading}
              className="flex-1 backdrop-blur-xl bg-white/20 border border-white/30"
            />
            <Button
              onClick={handleSendMessage}
              disabled={!newMessage.trim() || isLoading}
              size="icon"
              className="backdrop-blur-xl bg-white/20 border border-white/30"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};