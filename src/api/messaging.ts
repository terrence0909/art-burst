// CREATE: src/api/messaging.ts
import { fetchAuthSession } from "aws-amplify/auth";
import { fetchUserAttributes } from "aws-amplify/auth";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

export interface Message {
  messageId: string;
  conversationId: string;
  senderId: string;
  receiverId: string;
  content: string;
  timestamp: string;
  read: boolean;
  auctionId?: string;
}

export interface Conversation {
  conversationId: string;
  participants: string[];
  lastMessage?: string;
  lastMessageTimestamp?: string;
  auctionId?: string;
  participantDetails?: {
    userId: string;
    name: string;
    avatar?: string;
  }[];
}

export const messagingService = {
  // Start a new conversation
  async startConversation(receiverId: string, auctionId?: string): Promise<string> {
    try {
      const session = await fetchAuthSession();
      const idToken = session.tokens?.idToken?.toString();
      
      const currentUser = await fetchUserAttributes();
      const currentUserId = currentUser.sub;

      if (currentUserId === receiverId) {
        throw new Error("Cannot start conversation with yourself");
      }

      const response = await fetch(`${API_BASE_URL}/conversations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(idToken && { 'Authorization': `Bearer ${idToken}` }),
        },
        body: JSON.stringify({
          participants: [currentUserId, receiverId],
          auctionId: auctionId || null
        })
      });

      if (!response.ok) {
        throw new Error('Failed to start conversation');
      }

      const data = await response.json();
      return data.conversationId;
    } catch (error) {
      console.error('Error starting conversation:', error);
      throw error;
    }
  },

  // Get conversations for current user
  async getConversations(): Promise<Conversation[]> {
    try {
      const session = await fetchAuthSession();
      const idToken = session.tokens?.idToken?.toString();

      const response = await fetch(`${API_BASE_URL}/conversations`, {
        headers: {
          'Content-Type': 'application/json',
          ...(idToken && { 'Authorization': `Bearer ${idToken}` }),
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch conversations');
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching conversations:', error);
      throw error;
    }
  },

  // Get messages for a conversation
  async getMessages(conversationId: string): Promise<Message[]> {
    try {
      const session = await fetchAuthSession();
      const idToken = session.tokens?.idToken?.toString();

      const response = await fetch(`${API_BASE_URL}/conversations/${conversationId}/messages`, {
        headers: {
          'Content-Type': 'application/json',
          ...(idToken && { 'Authorization': `Bearer ${idToken}` }),
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch messages');
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching messages:', error);
      throw error;
    }
  },

  // Save message to database (for persistence)
  async saveMessage(conversationId: string, content: string, receiverId: string, auctionId?: string): Promise<Message> {
    try {
      const session = await fetchAuthSession();
      const idToken = session.tokens?.idToken?.toString();

      const response = await fetch(`${API_BASE_URL}/conversations/${conversationId}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(idToken && { 'Authorization': `Bearer ${idToken}` }),
        },
        body: JSON.stringify({
          content,
          receiverId,
          auctionId: auctionId || null
        })
      });

      if (!response.ok) {
        throw new Error('Failed to save message');
      }

      return await response.json();
    } catch (error) {
      console.error('Error saving message:', error);
      throw error;
    }
  }
};