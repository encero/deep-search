import type { ClientEvent, ServerEvent } from '@deep-search/shared';

type EventHandler = (event: ServerEvent) => void;

class WebSocketClient {
  private ws: WebSocket | null = null;
  private url: string;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private handlers: Map<string, Set<EventHandler>> = new Map();
  private currentSessionId: string | null = null;

  constructor() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    this.url = `${protocol}//${window.location.host}/ws`;
  }

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        resolve();
        return;
      }

      this.ws = new WebSocket(this.url);

      this.ws.onopen = () => {
        console.log('WebSocket connected');
        this.reconnectAttempts = 0;
        if (this.currentSessionId) {
          this.joinSession(this.currentSessionId);
        }
        resolve();
      };

      this.ws.onclose = () => {
        console.log('WebSocket disconnected');
        this.scheduleReconnect();
      };

      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        reject(error);
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data) as ServerEvent;
          this.emit(data.type, data);
          this.emit('*', data); // Wildcard handler
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      };
    });
  }

  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnect attempts reached');
      return;
    }

    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
    this.reconnectAttempts++;

    console.log(`Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);

    this.reconnectTimeout = setTimeout(() => {
      this.connect().catch(console.error);
    }, delay);
  }

  disconnect(): void {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
    }
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.currentSessionId = null;
  }

  private send(event: ClientEvent): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(event));
    }
  }

  joinSession(sessionId: string): void {
    this.currentSessionId = sessionId;
    this.send({ type: 'join_session', sessionId });
  }

  leaveSession(sessionId: string): void {
    this.send({ type: 'leave_session', sessionId });
    if (this.currentSessionId === sessionId) {
      this.currentSessionId = null;
    }
  }

  sendFeedback(
    sessionId: string,
    feedbackType: 'guidance' | 'approval' | 'stop' | 'redirect',
    content: string
  ): void {
    this.send({ type: 'send_feedback', sessionId, feedbackType, content });
  }

  requestFinish(sessionId: string): void {
    this.send({ type: 'request_finish', sessionId });
  }

  on(eventType: string, handler: EventHandler): () => void {
    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, new Set());
    }
    this.handlers.get(eventType)!.add(handler);

    // Return unsubscribe function
    return () => {
      this.handlers.get(eventType)?.delete(handler);
    };
  }

  private emit(eventType: string, event: ServerEvent): void {
    const handlers = this.handlers.get(eventType);
    if (handlers) {
      handlers.forEach((handler) => handler(event));
    }
  }
}

export const wsClient = new WebSocketClient();
