/**
 * Centralized API configurations for UniBites PWA.
 * Connects the React frontend to the backend microservices.
 */

const hostname = typeof window !== 'undefined' ? window.location.hostname : 'localhost';

const wsUrl = import.meta.env.VITE_WS_URL;
const httpFromWs = wsUrl ? wsUrl.replace(/^wss:/, 'https:').replace(/^ws:/, 'http:') : '';

// In production, Vite API URL can be injected. If empty, default to "" for relative routing.
export const CORE_API = import.meta.env.VITE_API_URL || "";

// In production, Wallet is routed through Core API (/api/wallet)
export const WALLET_API = import.meta.env.VITE_API_URL || `http://${hostname}:8002`;

// Chat API: in production, it is routed via Nginx (/api/chat) on the same domain.
// In development, it points directly to Go microservice (port 8003)
export const CHAT_API = httpFromWs || `http://${hostname}:8003`;

// Chat WS: in production, it points to wss://domain/chat/ws.
// In development, it points to ws://hostname:8003/ws
export const CHAT_WS = wsUrl ? `${wsUrl}/chat/ws` : `ws://${hostname}:8003/ws`;

