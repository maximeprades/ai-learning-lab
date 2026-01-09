const FRIENDLY_ERRORS: Record<string, string> = {
  "429": "The server is busy right now. Please wait a moment and try again.",
  "500": "Something went wrong on our end. Please try again in a few seconds.",
  "502": "The server is temporarily unavailable. Please wait a moment.",
  "503": "The service is temporarily overloaded. Please try again shortly.",
  "504": "The request took too long. Please try again.",
  "network": "Unable to connect. Please check your internet connection.",
  "timeout": "The request timed out. Please try again.",
};

export function getFriendlyError(error: unknown, fallback = "Something went wrong. Please try again."): string {
  if (error instanceof Response) {
    return FRIENDLY_ERRORS[error.status.toString()] || fallback;
  }
  if (error instanceof Error) {
    if (error.message.includes("fetch") || error.message.includes("network")) {
      return FRIENDLY_ERRORS.network;
    }
    if (error.message.includes("timeout")) {
      return FRIENDLY_ERRORS.timeout;
    }
    if (error.message.includes("429") || error.message.toLowerCase().includes("rate limit")) {
      return FRIENDLY_ERRORS["429"];
    }
  }
  if (typeof error === "string") {
    if (error.includes("429") || error.toLowerCase().includes("rate limit")) {
      return FRIENDLY_ERRORS["429"];
    }
    if (error.toLowerCase().includes("network") || error.toLowerCase().includes("connection")) {
      return FRIENDLY_ERRORS.network;
    }
    if (error.toLowerCase().includes("timeout")) {
      return FRIENDLY_ERRORS.timeout;
    }
    return error.length > 100 ? fallback : error;
  }
  return fallback;
}

export async function fetchWithRetry(
  url: string,
  options?: RequestInit,
  maxRetries = 3,
  baseDelay = 1000
): Promise<Response> {
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await fetch(url, options);
      
      if (response.status === 429) {
        const delay = baseDelay * Math.pow(2, attempt);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      
      return response;
    } catch (error) {
      lastError = error as Error;
      if (attempt < maxRetries - 1) {
        const delay = baseDelay * Math.pow(2, attempt);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw lastError || new Error("Request failed after retries");
}

export function createWebSocketWithReconnect(
  url: string,
  onMessage: (data: unknown) => void,
  onStatusChange?: (status: "connecting" | "connected" | "disconnected" | "error") => void
): { close: () => void } {
  let ws: WebSocket | null = null;
  let reconnectAttempts = 0;
  let reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
  let closed = false;
  const maxReconnectAttempts = 5;
  const baseReconnectDelay = 1000;

  function connect() {
    if (closed) return;
    
    onStatusChange?.("connecting");
    
    try {
      ws = new WebSocket(url);
    } catch (error) {
      console.error("WebSocket creation failed:", error);
      onStatusChange?.("error");
      scheduleReconnect();
      return;
    }

    ws.onopen = () => {
      reconnectAttempts = 0;
      onStatusChange?.("connected");
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        onMessage(data);
      } catch (e) {
        console.error("WebSocket message parse error:", e);
      }
    };

    ws.onerror = () => {
      onStatusChange?.("error");
    };

    ws.onclose = () => {
      ws = null;
      if (!closed) {
        onStatusChange?.("disconnected");
        scheduleReconnect();
      }
    };
  }

  function scheduleReconnect() {
    if (closed || reconnectAttempts >= maxReconnectAttempts) return;
    
    const delay = baseReconnectDelay * Math.pow(2, reconnectAttempts);
    reconnectAttempts++;
    
    reconnectTimeout = setTimeout(() => {
      connect();
    }, delay);
  }

  function close() {
    closed = true;
    if (reconnectTimeout) {
      clearTimeout(reconnectTimeout);
    }
    if (ws) {
      ws.close();
      ws = null;
    }
  }

  connect();

  return { close };
}
