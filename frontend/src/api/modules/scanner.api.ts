import { apiClient } from "../client";

export interface NetworkInfoResponse {
  primary_ip: string;
  all_ips: string[];
  is_docker_container_ip?: boolean;
  frontend_port: number;
  backend_port: number;
  suggested_scan_url: string;
}

const STORAGE_KEY = "partshop_scanner_host_ip";

export const scannerApi = {
  /**
   * Checks if an IP looks like Docker's internal container network (172.16.x.x - 172.31.x.x) or loopback.
   */
  isDockerInternalIp(ip: string): boolean {
    if (!ip) return false;
    const cleanIp = ip.split(":")[0].trim();
    if (cleanIp === "localhost" || cleanIp === "127.0.0.1" || cleanIp.startsWith("127.")) {
      return true;
    }
    const parts = cleanIp.split(".");
    if (parts.length === 4 && parts[0] === "172") {
      const second = parseInt(parts[1], 10);
      return !isNaN(second) && second >= 16 && second <= 31;
    }
    return false;
  },

  /**
   * Retrieves user's manually entered or saved host IP from localStorage.
   */
  getSavedHostIp(): string | null {
    if (typeof window === "undefined") return null;
    try {
      return localStorage.getItem(STORAGE_KEY);
    } catch {
      return null;
    }
  },

  /**
   * Saves preferred host IP to localStorage for instant reuse across sessions.
   */
  saveHostIp(ip: string): void {
    if (typeof window === "undefined") return;
    try {
      if (ip && ip.trim()) {
        localStorage.setItem(STORAGE_KEY, ip.trim());
      }
    } catch {
      // Ignore localStorage exceptions
    }
  },

  /**
   * Fetch local network IP addresses discovered by backend for pairing QR code.
   */
  async getNetworkInfo(): Promise<NetworkInfoResponse> {
    try {
      const data = await apiClient<NetworkInfoResponse>("/scanner/network-info", {
        cache: "no-store",
      });
      return data;
    } catch {
      // Fallback if offline
      const browserHost = typeof window !== "undefined" ? window.location.hostname : "localhost";
      return {
        primary_ip: browserHost,
        all_ips: [browserHost],
        is_docker_container_ip: false,
        frontend_port: 3000,
        backend_port: 8001,
        suggested_scan_url: `http://${browserHost}:3000/scan`,
      };
    }
  },

  /**
   * Generates a unique pairing session token.
   */
  generateSessionId(): string {
    const randomHex = Math.random().toString(36).substring(2, 8);
    const timestamp = Date.now().toString(36).substring(4);
    return `sess_${randomHex}${timestamp}`;
  },

  /**
   * Constructs the WebSocket URL for pairing.
   * Supports:
   * 1. Reverse-proxied same-origin production deployments (NEXT_PUBLIC_API_URL="/api/v1")
   * 2. Explicit remote API URLs (e.g. "https://api.example.com/api/v1")
   * 3. Local LAN development mode (direct port 8001 on host LAN IP)
   */
  getWebSocketUrl(sessionId: string, hostOverride?: string): string {
    const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || "";

    // 1. Same-origin reverse proxy mode (e.g. Caddy in production)
    if (apiBaseUrl.startsWith("/") && typeof window !== "undefined") {
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const cleanBase = apiBaseUrl.replace(/\/+$/, "");
      return `${protocol}//${window.location.host}${cleanBase}/scanner/ws/${sessionId}`;
    }

    // 2. Explicit remote API origin (non-localhost)
    if (apiBaseUrl.startsWith("http://") || apiBaseUrl.startsWith("https://")) {
      try {
        const parsed = new URL(apiBaseUrl);
        if (parsed.hostname !== "localhost" && parsed.hostname !== "127.0.0.1") {
          const wsProtocol = parsed.protocol === "https:" ? "wss:" : "ws:";
          const cleanPath = parsed.pathname.replace(/\/+$/, "");
          return `${wsProtocol}//${parsed.host}${cleanPath}/scanner/ws/${sessionId}`;
        }
      } catch {
        // Fall through to local LAN mode
      }
    }

    // 3. Local / LAN development mode
    let host = hostOverride;
    if (!host && typeof window !== "undefined") {
      host = window.location.hostname;
    }
    if (!host || host === "localhost" || host === "127.0.0.1") {
      host = "localhost";
    }

    const protocol = typeof window !== "undefined" && window.location.protocol === "https:" ? "wss:" : "ws:";
    return `${protocol}//${host}:8001/api/v1/scanner/ws/${sessionId}`;
  },
};
