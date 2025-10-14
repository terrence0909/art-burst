// src/services/websocket.ts
import { toast } from 'react-toastify';

export interface WebSocketMessage {
  action?: 'bidUpdate' | 'subscribe' | 'placeBid' | 'ping' | 'pong' | 'unsubscribe' | 'auctionEnded' | 'notification';
  type?: 'NEW_BID' | 'AUCTION_UPDATE' | 'SUBSCRIPTION_CONFIRMED' | 'ERROR' | 'AUCTION_ENDED' | 'NOTIFICATION';
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
  status?: 'success' | 'error' | 'duplicate' | 'forbidden';
  timestamp?: string;
  connectionId?: string;
  requestId?: string;
  // Add notification support
  notification?: {
    type: string;
    title: string;
    message: string;
    userId: string;
    relatedId?: string;
    metadata?: any;
  };
}

export class WebSocketAuctionService {
  private ws: WebSocket | null = null;
  private wsUrl: string;
  private subscribers: Map<string, Set<(msg: WebSocketMessage) => void>> = new Map();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private baseReconnectDelay = 1000;
  private subscriptions: Set<string> = new Set();
  private heartbeatInterval: number | null = null;
  private connectionPromise: Promise<void> | null = null;
  private lastMessageTime: number = 0;
  private isExplicitlyDisconnected: boolean = false;
  private pendingMessages: any[] = [];
  private _isConnected: boolean = false;
  
  // Add connection change callback support
  public onConnectionChange?: (connected: boolean) => void;

  constructor(wsUrl: string, auctionId: string, userId: string, authToken?: string) {
    // Add query parameters to the WebSocket URL
    const params = new URLSearchParams({
      auctionId,
      userId,
    });
    
    if (authToken) {
      params.set('auth', authToken);
    }
    
    this.wsUrl = `${wsUrl}?${params.toString()}`;
    this.setupNetworkMonitoring();
  }

  async connect(): Promise<void> {
    if (this.connectionPromise) return this.connectionPromise;
    if (this.isExplicitlyDisconnected) return;

    this.connectionPromise = new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(this.wsUrl);

        const timeout = setTimeout(() => {
          this.ws?.close();
          reject(new Error('Connection timeout'));
        }, 10000);

        this.ws.onopen = () => {
          clearTimeout(timeout);
          this.reconnectAttempts = 0;
          this.lastMessageTime = Date.now();
          this._isConnected = true;
          this.startHeartbeat();
          this.resubscribeToAll();
          this.flushPendingMessages();
          console.log('✅ WebSocket connected successfully');
          
          // Notify connection change
          if (this.onConnectionChange) {
            this.onConnectionChange(true);
          }
          
          resolve();
        };

        this.ws.onmessage = (event) => {
          try {
            this.lastMessageTime = Date.now();
            const message: WebSocketMessage = JSON.parse(event.data);
            this.handleMessage(message);
          } catch (err) {
            console.error('❌ Error parsing WebSocket message:', err);
          }
        };

        this.ws.onclose = (event) => {
          clearTimeout(timeout);
          this.ws = null;
          this.connectionPromise = null;
          this._isConnected = false;
          this.stopHeartbeat();

          console.log(`🔌 WebSocket closed with code: ${event.code}, reason: ${event.reason}`);
          
          // Notify connection change
          if (this.onConnectionChange) {
            this.onConnectionChange(false);
          }
          
          // Only reconnect for abnormal closures, not normal ones
          if (event.code !== 1000 && event.code !== 1001 && !this.isExplicitlyDisconnected) {
            console.log('🔄 Attempting to reconnect...');
            this.scheduleReconnection();
          } else {
            console.log('🔌 WebSocket closed normally, not reconnecting');
          }
        };

        this.ws.onerror = (error) => {
          console.error('❌ WebSocket error:', error);
          this.connectionPromise = null;
          this._isConnected = false;
          
          // Notify connection change
          if (this.onConnectionChange) {
            this.onConnectionChange(false);
          }
          
          if (!this.isExplicitlyDisconnected) this.scheduleReconnection();
        };
      } catch (error) {
        console.error('❌ Failed to connect:', error);
        this.connectionPromise = null;
        this._isConnected = false;
        
        // Notify connection change
        if (this.onConnectionChange) {
          this.onConnectionChange(false);
        }
        
        this.scheduleReconnection();
        reject(error);
      }
    });

    return this.connectionPromise;
  }

  private scheduleReconnection() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      toast.error('Connection lost. Please refresh the page.', { autoClose: 5000 });
      return;
    }

    const delay = this.baseReconnectDelay * Math.pow(2, this.reconnectAttempts);
    console.log(`⏰ Scheduling reconnection in ${delay}ms (attempt ${this.reconnectAttempts + 1})`);
    
    setTimeout(() => {
      this.reconnectAttempts++;
      this.connect().catch(console.error);
    }, delay);
  }

  private startHeartbeat() {
    this.stopHeartbeat();
    this.heartbeatInterval = window.setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ action: 'ping', timestamp: Date.now() }));
        this.checkConnectionHealth();
      }
    }, 30000);
  }

  private stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  private checkConnectionHealth() {
    if (this.ws?.readyState === WebSocket.OPEN) {
      // If no messages received in 2 minutes, connection might be dead
      if (Date.now() - this.lastMessageTime > 120000) {
        console.log('🩺 Connection appears stale, reconnecting...');
        this.ws.close();
        this.scheduleReconnection();
      }
    }
  }

  private setupNetworkMonitoring() {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        console.log('🌐 Network came online, reconnecting WebSocket...');
        if (!this.isConnected() && !this.isExplicitlyDisconnected) {
          this.connect().catch(console.error);
        }
      });
      
      window.addEventListener('offline', () => {
        console.log('🌐 Network went offline, WebSocket may disconnect');
      });
    }
  }

  private async resubscribeToAll() {
    const oldSubs = Array.from(this.subscriptions);
    this.subscriptions.clear();
    for (const auctionId of oldSubs) {
      await this.sendMessage({ action: 'subscribe', auctionId });
    }
  }

  private flushPendingMessages() {
    const messages = [...this.pendingMessages];
    this.pendingMessages = [];
    for (const msg of messages) this.sendMessageInternal(msg).catch(console.error);
  }

  async sendMessage(message: any) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      this.pendingMessages.push(message);
      if (!this.connectionPromise) await this.connect();
      return;
    }
    await this.sendMessageInternal(message);
  }

  private async sendMessageInternal(message: any) {
    try {
      this.ws!.send(JSON.stringify(message));
      this.lastMessageTime = Date.now();
    } catch (err) {
      console.error('❌ Error sending message:', err);
      throw err;
    }
  }

  subscribe(auctionId: string, callback: (msg: WebSocketMessage) => void): () => void {
    if (!this.subscribers.has(auctionId)) this.subscribers.set(auctionId, new Set());
    this.subscribers.get(auctionId)!.add(callback);

    if (!this.subscriptions.has(auctionId)) {
      this.subscriptions.add(auctionId);
      if (this.isConnected()) this.sendMessage({ action: 'subscribe', auctionId }).catch(console.error);
    }

    return () => this.unsubscribe(auctionId, callback);
  }

  private unsubscribe(auctionId: string, callback: (msg: WebSocketMessage) => void) {
    const subs = this.subscribers.get(auctionId);
    if (!subs) return;
    subs.delete(callback);

    if (subs.size === 0) {
      this.subscribers.delete(auctionId);
      this.subscriptions.delete(auctionId);
      if (this.isConnected()) this.sendMessage({ action: 'unsubscribe', auctionId }).catch(console.error);
    }
  }

  private handleMessage(message: WebSocketMessage) {
    // Forward to subscribers
    if (message.auctionId) {
      const auctionSubs = this.subscribers.get(message.auctionId);
      auctionSubs?.forEach(cb => cb(message));
    }
    // Wildcard subscribers
    const wildcardSubs = this.subscribers.get('*');
    wildcardSubs?.forEach(cb => cb(message));
  }

  async placeBid(auctionId: string, bidAmount: number, bidderId: string) {
    await this.sendMessage({ action: 'placeBid', auctionId, bidAmount, bidderId });
  }

  disconnect() {
    this.isExplicitlyDisconnected = true;
    this._isConnected = false;
    this.stopHeartbeat();
    this.ws?.close();
    this.ws = null;
    this.connectionPromise = null;
    this.subscribers.clear();
    this.subscriptions.clear();
    this.pendingMessages = [];
    
    // Notify connection change
    if (this.onConnectionChange) {
      this.onConnectionChange(false);
    }
  }

  isConnected() {
    return this.ws?.readyState === WebSocket.OPEN && this._isConnected;
  }

  getSubscriptions() {
    return Array.from(this.subscriptions);
  }
}

// Factory function to create WebSocket service instances
export const createWebSocketService = (auctionId: string, userId: string, authToken?: string) => {
  return new WebSocketAuctionService(
    import.meta.env.VITE_WEBSOCKET_URL || 'wss://qm968tbs12.execute-api.us-east-1.amazonaws.com/prod',
    auctionId,
    userId,
    authToken
  );
};

// Deprecated singleton (will throw errors to force migration)
export const wsService = {
  connect: () => { 
    throw new Error('wsService singleton is deprecated. Use createWebSocketService(auctionId, userId) instead.');
  },
  disconnect: () => {
    throw new Error('wsService singleton is deprecated. Use createWebSocketService(auctionId, userId) instead.');
  },
  isConnected: () => {
    throw new Error('wsService singleton is deprecated. Use createWebSocketService(auctionId, userId) instead.');
  },
  subscribe: () => {
    throw new Error('wsService singleton is deprecated. Use createWebSocketService(auctionId, userId) instead.');
  },
  placeBid: () => {
    throw new Error('wsService singleton is deprecated. Use createWebSocketService(auctionId, userId) instead.');
  },
  getSubscriptions: () => {
    throw new Error('wsService singleton is deprecated. Use createWebSocketService(auctionId, userId) instead.');
  },
  sendMessage: () => {
    throw new Error('wsService singleton is deprecated. Use createWebSocketService(auctionId, userId) instead.');
  }
};