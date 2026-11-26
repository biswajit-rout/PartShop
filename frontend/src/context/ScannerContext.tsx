"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  useCallback,
  ReactNode,
} from "react";
import { SparePart } from "@/types";
import { scannerApi } from "@/api";
import { matchScannedCode } from "@/utils/search";

export interface ConnectedDevice {
  device_id: string;
  device_name: string;
  connected_at: number;
  scan_count: number;
}

export interface ScannerScanEvent {
  barcode: string;
  matchedPart: SparePart | null;
  deviceName?: string;
  timestamp: number;
}

interface ScannerContextType {
  sessionId: string;
  hostIp: string;
  setHostIp: (ip: string) => void;
  allHostIps: string[];
  connectedDevices: ConnectedDevice[];
  isPhoneConnected: boolean;
  isModalOpen: boolean;
  setIsModalOpen: (open: boolean) => void;
  lastScanEvent: ScannerScanEvent | null;
  scannedBatch: SparePart[];
  clearScannedBatch: () => void;
  generateNewSession: () => void;
  scannerMode: "SEARCH" | "RESTOCK";
  setScannerMode: (mode: "SEARCH" | "RESTOCK") => void;
  toastMessage: string | null;
  clearToast: () => void;
  // External listener hook for Add/Edit modals (e.g. auto-fill barcode)
  registerBarcodeListener: (listener: (barcode: string) => void) => () => void;
}

const ScannerContext = createContext<ScannerContextType | null>(null);

const STORAGE_SESSION_KEY = "partshop_scanner_session_id";

export function ScannerProvider({
  children,
  products,
  onPartScannedForBilling,
}: {
  children: ReactNode;
  products: SparePart[];
  onPartScannedForBilling?: (part: SparePart) => void;
}) {
  const [sessionId, setSessionId] = useState<string>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem(STORAGE_SESSION_KEY);
      if (saved && saved.trim()) return saved.trim();
    }
    const fresh = scannerApi.generateSessionId();
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(STORAGE_SESSION_KEY, fresh);
      } catch {}
    }
    return fresh;
  });

  const [hostIp, setHostIpState] = useState<string>("192.168.1.9");
  const [allHostIps, setAllHostIps] = useState<string[]>(["192.168.1.9"]);
  const [connectedDevices, setConnectedDevices] = useState<ConnectedDevice[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [scannerMode, setScannerMode] = useState<"SEARCH" | "RESTOCK">("SEARCH");
  const [lastScanEvent, setLastScanEvent] = useState<ScannerScanEvent | null>(null);
  const [scannedBatch, setScannedBatch] = useState<SparePart[]>([]);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const barcodeListenersRef = useRef<Set<(barcode: string) => void>>(new Set());

  const setHostIp = (ip: string) => {
    let trimmed = ip.trim();
    if (scannerApi.isDockerInternalIp(trimmed)) {
      trimmed = "192.168.1.9";
    }
    setHostIpState(trimmed);
    if (!scannerApi.isDockerInternalIp(trimmed)) {
      scannerApi.saveHostIp(trimmed);
    }
  };

  // 1. Discover local host network IPs on mount
  useEffect(() => {
    async function initNetwork() {
      const saved = scannerApi.getSavedHostIp();
      const info = await scannerApi.getNetworkInfo();

      // If saved IP is a Docker internal IP (172.16-31.x.x), purge it immediately
      let validSaved = saved;
      if (saved && scannerApi.isDockerInternalIp(saved)) {
        try {
          localStorage.removeItem("partshop_scanner_host_ip");
        } catch {}
        validSaved = null;
      }

      // Prioritize reachable LAN IP
      let initialIp = validSaved;
      if (!initialIp && info.primary_ip && !scannerApi.isDockerInternalIp(info.primary_ip)) {
        initialIp = info.primary_ip;
      }
      if (!initialIp && typeof window !== "undefined" && window.location.hostname) {
        const winHost = window.location.hostname;
        if (winHost !== "localhost" && winHost !== "127.0.0.1" && !scannerApi.isDockerInternalIp(winHost)) {
          initialIp = winHost;
        }
      }
      if (!initialIp && info.all_ips?.length) {
        initialIp = info.all_ips.find((ip) => !scannerApi.isDockerInternalIp(ip) && !ip.startsWith("127.")) || null;
      }
      if (!initialIp || scannerApi.isDockerInternalIp(initialIp)) {
        initialIp = "192.168.1.9";
      }

      setHostIpState(initialIp);
      const cleanIps = (info.all_ips || []).filter((ip) => !scannerApi.isDockerInternalIp(ip));
      if (!cleanIps.includes(initialIp)) {
        cleanIps.unshift(initialIp);
      }
      setAllHostIps(cleanIps);
    }
    initNetwork();
  }, []);

  // 2. Establish persistent background WebSocket connection (independent of modal visibility)
  useEffect(() => {
    if (!sessionId) return;

    let isCleanedUp = false;

    function connectWs() {
      if (isCleanedUp) return;

      const wsUrl = scannerApi.getWebSocketUrl(sessionId, hostIp);
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        // Query current room roster on open
        try {
          ws.send(JSON.stringify({ type: "GET_ROSTER", session_id: sessionId }));
        } catch {}
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          // Update multi-device roster
          if (data.type === "ROSTER_UPDATED" && Array.isArray(data.devices)) {
            setConnectedDevices(data.devices);
            if (data.new_device?.device_name) {
              setToastMessage(`📱 ${data.new_device.device_name} paired!`);
              setTimeout(() => setToastMessage(null), 3000);
            }
          } else if (data.type === "DEVICE_DISCONNECTED") {
            const devName = data.device?.device_name || "Device";
            setToastMessage(`📱 ${devName} disconnected`);
            setTimeout(() => setToastMessage(null), 2500);
          } else if (data.type === "BARCODE_SCANNED") {
            const scannedBarcode: string = data.barcode;
            const deviceName: string = data.device_name || data.device || "Mobile Scanner";

            // Find matching product using smart automotive QR & Barcode resolver
            const matched = products.find((p) => matchScannedCode(p, scannedBarcode)) || null;

            const scanEvt: ScannerScanEvent = {
              barcode: scannedBarcode,
              matchedPart: matched,
              deviceName,
              timestamp: data.timestamp || Date.now(),
            };

            setLastScanEvent(scanEvt);

            if (matched) {
              setScannedBatch((prev) => [matched, ...prev.filter((p) => p.id !== matched.id)]);
              setToastMessage(`⚡ [${deviceName}] Scanned: ${matched.name} (${matched.partNumber})`);
            } else {
              setToastMessage(`🔍 [${deviceName}] Scanned: ${scannedBarcode} (Unknown SKU)`);
            }

            setTimeout(() => setToastMessage(null), 4000);

            // Notify custom active listeners (e.g. Add/Edit modal barcode inputs)
            barcodeListenersRef.current.forEach((listener) => {
              try {
                listener(scannedBarcode);
              } catch (err) {
                console.warn("Barcode listener error:", err);
              }
            });
          }
        } catch (err) {
          console.warn("Error parsing scanner WS message:", err);
        }
      };

      ws.onclose = () => {
        setConnectedDevices([]);
        // Reconnect automatically after 3 seconds if not unmounted
        if (!isCleanedUp) {
          reconnectTimeoutRef.current = setTimeout(() => {
            connectWs();
          }, 3000);
        }
      };

      ws.onerror = () => {
        ws.close();
      };
    }

    connectWs();

    return () => {
      isCleanedUp = true;
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [sessionId, hostIp, products]);

  // Generate a new pairing session ID
  const generateNewSession = () => {
    const newSid = scannerApi.generateSessionId();
    setSessionId(newSid);
    setConnectedDevices([]);
    setScannedBatch([]);
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(STORAGE_SESSION_KEY, newSid);
      } catch {}
    }
  };

  const clearScannedBatch = () => {
    setScannedBatch([]);
  };

  const clearToast = () => {
    setToastMessage(null);
  };

  const registerBarcodeListener = useCallback((listener: (barcode: string) => void) => {
    barcodeListenersRef.current.add(listener);
    return () => {
      barcodeListenersRef.current.delete(listener);
    };
  }, []);

  return (
    <ScannerContext.Provider
      value={{
        sessionId,
        hostIp,
        setHostIp,
        allHostIps,
        connectedDevices,
        isPhoneConnected: connectedDevices.length > 0,
        isModalOpen,
        setIsModalOpen,
        lastScanEvent,
        scannedBatch,
        clearScannedBatch,
        generateNewSession,
        scannerMode,
        setScannerMode,
        toastMessage,
        clearToast,
        registerBarcodeListener,
      }}
    >
      {children}
    </ScannerContext.Provider>
  );
}

export function useScannerSession(): ScannerContextType {
  const context = useContext(ScannerContext);
  if (!context) {
    throw new Error("useScannerSession must be used within a ScannerProvider");
  }
  return context;
}
