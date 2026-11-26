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
   * Checks if an IP looks like Docker's internal container network (172.16.x.x - 172.31.x.x).
   */
  isDockerInternalIp(ip: string): boolean {
    if (!ip) return false;
    const parts = ip.trim().split(".");
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
   */
  getWebSocketUrl(sessionId: string, hostOverride?: string): string {
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
