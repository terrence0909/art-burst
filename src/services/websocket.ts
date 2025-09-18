// src/services/websocket.ts
import { toast } from 'react-toastify';

export interface WebSocketMessage {
  action?: 'bidUpdate' | 'subscribe' | 'placeBid' | 'ping';
  type?: 'NEW_BID' | 'AUCTION_UPDATE' | 'SUBSCRIPTION_CONFIRMED' | 'ERROR';
  message?: string;
  auctionId?: string;
  bid?: {
    bidId: string;
    bidAmount: number;
    bidderId: string;
    bidTime: string;
  };
  auction?: any;
  error?: string;
  status?: 'success' | 'error' | 'duplicate';
  timestamp: string;
}

export class WebSocketAuctionService {
  private ws: WebSocket | null = null;
  private wsUrl: string;
  private subscribers: Map<string, Set<(message: WebSocketMessage) => void>> = new Map();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private subscriptions: Set<string> = new Set();
  private heartbeatInterval: NodeJS.Timeout | null = null;

  constructor(wsUrl: string) {
    this.wsUrl = wsUrl;
  }

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(this.wsUrl);

        this.ws.onopen = () => {
          console.log('WebSocket connected');
          this.reconnectAttempts = 0;
          
          // Start heartbeat
          this.startHeartbeat();
          
          // Re-subscribe to any existing subscriptions
          this.subscriptions.forEach(auctionId => {
            this.sendSubscription(auctionId);
          });
          
          resolve();
        };

        this.ws.onmessage = (event) => {
          try {
            const message: WebSocketMessage = JSON.parse(event.data);
            this.handleMessage(message);
          } catch (error) {
            console.error('Error parsing WebSocket message:', error);
            toast.error('Failed to process update');
          }
        };

        this.ws.onclose = (event) => {
          console.log('WebSocket disconnected:', event.code, event.reason);
          this.ws = null;
          this.stopHeartbeat();
          
          if (!event.wasClean && this.reconnectAttempts < this.maxReconnectAttempts) {
            setTimeout(() => {
              this.reconnectAttempts++;
              console.log(`Reconnecting... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
              this.connect();
            }, this.reconnectDelay * this.reconnectAttempts);
          }
        };

        this.ws.onerror = (error) => {
          console.error('WebSocket error:', error);
          toast.error('Connection error');
          reject(error);
        };

      } catch (error) {
        reject(error);
      }
    });
  }

  private startHeartbeat() {
    this.heartbeatInterval = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ action: 'ping' }));
      }
    }, 30000); // Every 30 seconds
  }

  private stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  sendMessage(message: any): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    } else {
      console.error('WebSocket is not connected');
      throw new Error('WebSocket is not connected');
    }
  }

  subscribe(auctionId: string, callback: (message: WebSocketMessage) => void): () => void {
    if (!this.subscribers.has(auctionId)) {
      this.subscribers.set(auctionId, new Set());
    }

    this.subscribers.get(auctionId)!.add(callback);
    this.subscriptions.add(auctionId);

    // Send subscription message if connected
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.sendSubscription(auctionId);
    }

    // Return unsubscribe function
    return () => {
      const auctionSubscribers = this.subscribers.get(auctionId);
      if (auctionSubscribers) {
        auctionSubscribers.delete(callback);
        if (auctionSubscribers.size === 0) {
          this.subscribers.delete(auctionId);
          this.subscriptions.delete(auctionId);
        }
      }
    };
  }

  private sendSubscription(auctionId: string) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        action: 'subscribe',
        auctionId
      }));
    }
  }

  private handleMessage(message: WebSocketMessage) {
    console.log('Received WebSocket message:', message);

    // Handle different message types
    if (message.action === 'bidUpdate') {
      this.handleBidUpdate(message);
    } else if (message.message && message.status) {
      this.handleLambdaResponse(message);
    } else if (message.action === 'ping') {
      // Respond to ping
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ action: 'pong' }));
      }
    }

    // Notify subscribers
    if (message.auctionId) {
      const subscribers = this.subscribers.get(message.auctionId);
      if (subscribers) {
        subscribers.forEach(callback => callback(message));
      }
    }

    // Also notify general subscribers
    const generalSubscribers = this.subscribers.get('*');
    if (generalSubscribers) {
      generalSubscribers.forEach(callback => callback(message));
    }
  }

  private handleBidUpdate(message: WebSocketMessage) {
    if (message.bid && message.auctionId) {
      // Show toast notification for new bids
      toast.info(`💸 New bid: R${message.bid.bidAmount} by ${message.bid.bidderId}`, {
        position: "top-right",
        autoClose: 5000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
        progress: undefined,
      });
    }
  }

  private handleLambdaResponse(message: WebSocketMessage) {
    if (message.status === 'success') {
      if (message.message?.includes('Subscribed')) {
        toast.success(`✅ ${message.message}`, { 
          autoClose: 2000,
          position: "top-right"
        });
      } else if (message.message?.includes('Bid placed')) {
        toast.success(`🏆 ${message.message}`, { 
          autoClose: 3000,
          position: "top-right"
        });
      }
    } else if (message.status === 'error' && message.error) {
      toast.error(`❌ ${message.error}`, { 
        autoClose: 5000,
        position: "top-right"
      });
    } else if (message.status === 'duplicate') {
      toast.info(`ℹ️ ${message.message}`, { 
        autoClose: 2000,
        position: "top-right"
      });
    }
  }

  placeBid(auctionId: string, bidAmount: number, bidderId: string) {
    this.sendMessage({
      action: 'placeBid',
      auctionId,
      bidAmount,
      bidderId
    });
  }

  disconnect() {
    this.stopHeartbeat();
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.subscribers.clear();
    this.subscriptions.clear();
  }

  isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }

  getSubscriptions(): string[] {
    return Array.from(this.subscriptions);
  }
}

// Export singleton instance
export const wsService = new WebSocketAuctionService(
  import.meta.env.VITE_WEBSOCKET_URL || 'wss://qm968tbs12.execute-api.us-east-1.amazonaws.com/prod'
);