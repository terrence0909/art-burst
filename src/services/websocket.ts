// src/services/websocket.ts
export interface WebSocketMessage {
  type: 'NEW_BID' | 'AUCTION_UPDATE' | 'SUBSCRIPTION_CONFIRMED' | 'ERROR';
  message?: string; // Added for Lambda responses
  auctionId?: string;
  bid?: any;
  auction?: any;
  error?: string;
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
          }
        };

        this.ws.onclose = (event) => {
          console.log('WebSocket disconnected:', event.code, event.reason);
          this.ws = null;
          
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
          reject(error);
        };

      } catch (error) {
        reject(error);
      }
    });
  }

  // Send any message through WebSocket
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

    if (message.auctionId) {
      const subscribers = this.subscribers.get(message.auctionId);
      if (subscribers) {
        subscribers.forEach(callback => callback(message));
      }
    }

    // Also notify general subscribers (no specific auction)
    const generalSubscribers = this.subscribers.get('*');
    if (generalSubscribers) {
      generalSubscribers.forEach(callback => callback(message));
    }
  }

  disconnect() {
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
}

// Export singleton instance
export const wsService = new WebSocketAuctionService(
  import.meta.env.VITE_WEBSOCKET_URL || 'wss://your-websocket-api.execute-api.region.amazonaws.com/dev'
);