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
      // For now, generate a conversation ID
      const conversationId = `conv-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      return conversationId;
    } catch (error) {
      console.error('Error starting conversation:', error);
      throw error;
    }
  },

  async getConversations(): Promise<Conversation[]> {
    try {
      // TODO: Implement this when you have a getConversations API
      console.log('getConversations not implemented yet');
      return [];
    } catch (error) {
      console.error('Error fetching conversations:', error);
      return [];
    }
  },

  async getMessages(conversationId: string): Promise<Message[]> {
    try {
      // TODO: Implement this when you have a getMessages API
      console.log('getMessages not implemented yet for conversation:', conversationId);
      return [];
    } catch (error) {
      console.error('Error fetching messages:', error);
      return [];
    }
  },

  async saveMessage(conversationId: string, content: string, receiverId: string, auctionId?: string): Promise<Message> {
    try {
      const session = await fetchAuthSession();
      const idToken = session.tokens?.idToken?.toString();

      // Use your working sendMessage endpoint
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
          test: !idToken // Use test mode if no auth token
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