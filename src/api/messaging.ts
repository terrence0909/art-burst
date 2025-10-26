// src/api/messaging.ts - REAL API VERSION
import { fetchAuthSession } from "aws-amplify/auth";
import { fetchUserAttributes } from "aws-amplify/auth";

const API_BASE_URL = 'https://wckv09j9eg.execute-api.us-east-1.amazonaws.com/prod';

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
}

export const messagingService = {
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
      return [];
    }
  },

  async getMessages(conversationId: string): Promise<Message[]> {
    try {
      const session = await fetchAuthSession();
      const idToken = session.tokens?.idToken?.toString();

      const response = await fetch(`${API_BASE_URL}/conversations/messages`, {
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
      return [];
    }
  },

  async saveMessage(conversationId: string, content: string, receiverId: string, auctionId?: string): Promise<Message> {
    try {
      const session = await fetchAuthSession();
      const idToken = session.tokens?.idToken?.toString();

      const response = await fetch(`${API_BASE_URL}/sendMessage`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(idToken && { 'Authorization': `Bearer ${idToken}` }),
        },
        body: JSON.stringify({
          conversationId,
          message: content,
          receiverId,
          auctionId: auctionId || null,
          test: true
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to send message: ${errorText}`);
      }

      const result = await response.json();
      return result.message;
    } catch (error) {
      console.error('Error sending message:', error);
      throw error;
    }
  }
};