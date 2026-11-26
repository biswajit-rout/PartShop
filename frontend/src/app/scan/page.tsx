"use client";

import React, { useState, useEffect, useRef, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { scannerApi } from "@/api";
import { BrowserMultiFormatReader } from "@zxing/browser";
import {
  Camera,
  CheckCircle2,
  XCircle,
  Wifi,
  WifiOff,
  Volume2,
  VolumeX,
  Vibrate,
  RotateCcw,
  Send,
  Barcode,
  Sparkles,
  Layers,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  Image as ImageIcon,
} from "lucide-react";

// Web Audio API beep synthesizer (no external audio asset required)
function playBeep() {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(880, ctx.currentTime); // A5 high beep
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.12);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.13);
  } catch {
    // Ignore if audio context blocked before user interaction
  }
}

function ScannerContent() {
  const searchParams = useSearchParams();
  const urlSid = searchParams.get("sid") || searchParams.get("session") || "";

  const [sessionId, setSessionId] = useState(urlSid);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<"connecting" | "connected" | "disconnected">("connecting");
  const [lastScannedCode, setLastScannedCode] = useState<string | null>(null);
  const [scanHistory, setScanHistory] = useState<{ code: string; time: string }[]>([]);
  const [manualCode, setManualCode] = useState("");
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isProcessingPhoto, setIsProcessingPhoto] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [showAndroidHelp, setShowAndroidHelp] = useState(false);

  // Stable unique device ID
  const [deviceId] = useState<string>(() => {
    if (typeof window !== "undefined") {
      let saved = localStorage.getItem("partshop_device_id");
      if (!saved) {
        saved = "dev_" + Math.random().toString(36).substring(2, 8);
        try {
          localStorage.setItem("partshop_device_id", saved);
        } catch {}
      }
      return saved;
    }
    return "dev_" + Math.random().toString(36).substring(2, 8);
  });

  // Friendly human-readable device name
  const [deviceName, setDeviceName] = useState<string>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("partshop_device_name");
      if (saved && saved.trim()) return saved.trim();
    }
    if (typeof navigator !== "undefined") {
      if (/iPhone/i.test(navigator.userAgent)) return "iPhone";
      if (/iPad/i.test(navigator.userAgent)) return "iPad";
      if (/Android/i.test(navigator.userAgent)) {
        const match = navigator.userAgent.match(/Android[^;]+;\s*([^)]+)\)/);
        if (match && match[1]) {
          const model = match[1].split(";")[0].split("Build")[0].trim();
          if (model) return model;
        }
        return "Android Phone";
      }
    }
    return "Mobile Device";
  });

  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const lastScanTimestamp = useRef<number>(0);
  const lastCodeRef = useRef<string>("");
  const codeReaderRef = useRef<BrowserMultiFormatReader | null>(null);

  // Send scanned barcode to desktop terminal via WebSocket
  const sendBarcode = useCallback(
    (code: string) => {
      const trimmed = code.trim();
      if (!trimmed) return;

      const now = Date.now();
      // Debounce: prevent spamming the exact same code within 1.8 seconds
      if (trimmed === lastCodeRef.current && now - lastScanTimestamp.current < 1800) {
        return;
      }

      lastScanTimestamp.current = now;
      lastCodeRef.current = trimmed;
      setLastScannedCode(trimmed);
      setPhotoError(null);

      const timeStr = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
      setScanHistory((prev) => [{ code: trimmed, time: timeStr }, ...prev.slice(0, 9)]);

      // Audio & Haptic feedback
      if (soundEnabled) {
        playBeep();
      }
      if (typeof navigator !== "undefined" && navigator.vibrate) {
        navigator.vibrate([100]);
      }

      // Dispatch to WebSocket
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(
          JSON.stringify({
            type: "BARCODE_SCANNED",
            barcode: trimmed,
            device_id: deviceId,
            device_name: deviceName,
            session_id: sessionId,
            timestamp: now,
          })
        );
      }
    },
    [sessionId, soundEnabled, deviceId, deviceName]
  );

  // 1. Establish WebSocket Connection
  useEffect(() => {
    if (!sessionId) {
      setConnectionStatus("disconnected");
      return;
    }

    setConnectionStatus("connecting");
    const wsUrl = scannerApi.getWebSocketUrl(sessionId);
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      setIsConnected(true);
      setConnectionStatus("connected");
      // Notify desktop that mobile has paired
      ws.send(
        JSON.stringify({
          type: "DEVICE_CONNECTED",
          device_id: deviceId,
          device_type: "mobile",
          device_name: deviceName,
          session_id: sessionId,
          connected_at: Date.now(),
        })
      );
    };

    ws.onclose = () => {
      setIsConnected(false);
      setConnectionStatus("disconnected");
    };

    ws.onerror = () => {
      setIsConnected(false);
      setConnectionStatus("disconnected");
    };

    // Keep-alive ping every 15 seconds
    const pingInterval = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: "PING" }));
      }
    }, 15000);

    return () => {
      clearInterval(pingInterval);
      ws.close();
    };
  }, [sessionId]);

  // 2. Continuous Video Stream & Barcode Detection
  useEffect(() => {
    let isActive = true;
    let stream: MediaStream | null = null;

    async function initCamera() {
      setCameraError(null);

      // Check if getUserMedia is supported in the current context
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setCameraError(
          "HTTP blocks continuous video streaming on mobile. Use 'Snap with Camera' below (works immediately on any phone)."
        );
        return;
      }

      try {
        const codeReader = new BrowserMultiFormatReader();
        codeReaderRef.current = codeReader;

        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: "environment" },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        });

        if (!isActive) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
          setCameraActive(true);

          // Start ZXing continuous frame analysis
          codeReader.decodeFromVideoElement(videoRef.current, (result, err) => {
            if (result && result.getText()) {
              sendBarcode(result.getText());
            }
          });
        }
      } catch (err: any) {
        console.warn("Camera init failed:", err);
        setCameraActive(false);
        if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
          setCameraError("Camera permission was denied. Tap 'Allow' or use 'Snap with Camera' below.");
        } else {
          setCameraError(
            "HTTP blocks continuous video streaming on mobile. Use 'Snap with Camera' below (works immediately on any phone)."
          );
        }
      }
    }

    initCamera();

    return () => {
      isActive = false;
      if (codeReaderRef.current) {
        // Stop continuous decoding if active
        try {
          (codeReaderRef.current as any).reset();
        } catch {
          // Ignore
        }
      }
      if (stream) {
        stream.getTracks().forEach((t) => t.stop());
      }
    };
  }, [sendBarcode]);

  // 3. Handle HTML5 Camera Photo Snap (Works on 100% of smartphones over plain HTTP)
  const handlePhotoCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessingPhoto(true);
    setPhotoError(null);

    const blobUrl = URL.createObjectURL(file);
    try {
      const codeReader = new BrowserMultiFormatReader();
      let detectedText: string | null = null;

      // 1. Try decoding with ZXing
      try {
        const result = await codeReader.decodeFromImageUrl(blobUrl);
        if (result && result.getText()) {
          detectedText = result.getText();
        }
      } catch {
        // ZXing couldn't decode on first pass, proceed to native detector
      }

      // 2. Try native BarcodeDetector if available
      if (!detectedText && "BarcodeDetector" in window) {
        try {
          const img = new Image();
          img.src = blobUrl;
          await new Promise((resolve) => {
            img.onload = resolve;
          });
          const detector = new (window as any).BarcodeDetector({
            formats: ["ean_13", "ean_8", "code_128", "code_39", "qr_code", "upc_a", "upc_e"],
          });
          const results = await detector.detect(img);
          if (results && results.length > 0 && results[0].rawValue) {
            detectedText = results[0].rawValue;
          }
        } catch {
          // Native detector error
        }
      }

      if (detectedText) {
        sendBarcode(detectedText);
      } else {
        setPhotoError("No barcode recognized in photo. Please ensure barcode is well-lit and in focus.");
      }
    } catch (err: any) {
      setPhotoError("Failed to decode photo. Try snapping again closer to the barcode.");
    } finally {
      URL.revokeObjectURL(blobUrl);
      setIsProcessingPhoto(false);
      // Reset input value so same photo or next snap can trigger onChange
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualCode.trim()) {
      sendBarcode(manualCode.trim());
      setManualCode("");
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between font-sans selection:bg-sky-500/30">
      {/* Hidden file input for native camera snapshot (works 100% on HTTP) */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handlePhotoCapture}
        className="hidden"
      />

      {/* Top Mobile App Bar */}
      <header className="px-4 py-3 bg-slate-900/80 backdrop-blur-md border-b border-white/10 sticky top-0 z-20 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-sky-400 to-blue-600 flex items-center justify-center text-white shadow-md">
            <Barcode size={18} />
          </div>
          <div>
            <h1 className="text-sm font-bold text-white tracking-tight flex items-center gap-1.5">
              PartShop Scanner
              <span className="text-[9px] uppercase px-1.5 py-0.2 rounded bg-sky-500/20 text-sky-400 font-mono border border-sky-500/30">
                LIVE
              </span>
            </h1>
            <p className="text-[10px] text-slate-400 font-mono">
              Device: <span className="text-sky-300 font-semibold">{deviceName}</span> · Session: {sessionId ? sessionId.substring(0, 8) + "..." : "Offline"}
            </p>
          </div>
        </div>

        {/* Status Indicators & Controls */}
        <div className="flex items-center gap-2">
          {/* Sound toggle */}
          <button
            onClick={() => setSoundEnabled((v) => !v)}
            className="p-2 rounded-xl bg-white/5 border border-white/10 text-slate-300 hover:text-white"
            aria-label="Toggle sound"
          >
            {soundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} className="text-slate-500" />}
          </button>

          {/* Connection status pill */}
          <div
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-mono border ${
              connectionStatus === "connected"
                ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                : connectionStatus === "connecting"
                ? "bg-amber-500/15 text-amber-400 border-amber-500/30"
                : "bg-rose-500/15 text-rose-400 border-rose-500/30"
            }`}
          >
            {connectionStatus === "connected" ? (
              <>
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>Connected</span>
              </>
            ) : connectionStatus === "connecting" ? (
              <>
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-spin" />
                <span>Connecting</span>
              </>
            ) : (
              <>
                <span className="w-2 h-2 rounded-full bg-rose-400" />
                <span>Offline</span>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Main Viewport */}
      <main className="flex-1 flex flex-col p-4 max-w-lg mx-auto w-full space-y-4">
        {/* Camera Scanner Viewfinder */}
        <div className="relative aspect-[4/3] rounded-3xl overflow-hidden bg-slate-900 border border-white/10 shadow-2xl flex items-center justify-center">
          <video
            ref={videoRef}
            playsInline
            muted
            className={`absolute inset-0 w-full h-full object-cover ${cameraActive ? "block" : "hidden"}`}
          />

          {/* Optical Targeting Reticle (shown when camera is active) */}
          {cameraActive && (
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
              <div className="w-64 h-36 border-2 border-sky-400/80 rounded-2xl relative shadow-[0_0_30px_rgba(56,189,248,0.25)]">
                <div className="absolute -top-1 -left-1 w-4 h-4 border-t-2 border-l-2 border-sky-300" />
                <div className="absolute -top-1 -right-1 w-4 h-4 border-t-2 border-r-2 border-sky-300" />
                <div className="absolute -bottom-1 -left-1 w-4 h-4 border-b-2 border-l-2 border-sky-300" />
                <div className="absolute -bottom-1 -right-1 w-4 h-4 border-b-2 border-r-2 border-sky-300" />
                <div className="absolute inset-x-2 h-0.5 bg-gradient-to-r from-transparent via-red-500 to-transparent shadow-[0_0_8px_#ef4444] animate-bounce top-1/2" />
              </div>
            </div>
          )}

          {/* Fallback Banner & Quick Snap Trigger when continuous video is blocked */}
          {!cameraActive && (
            <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-sm p-5 flex flex-col items-center justify-center text-center z-10 space-y-3">
              <div className="w-14 h-14 rounded-2xl bg-sky-500/15 border border-sky-500/30 flex items-center justify-center text-sky-400 shadow-lg shadow-sky-500/10">
                <Camera size={28} />
              </div>

              <div>
                <h3 className="text-sm font-bold text-white mb-1">Mobile Camera Ready</h3>
                <p className="text-[11px] text-slate-300 max-w-xs leading-relaxed">
                  Tap below to open your phone camera and scan the barcode packaging.
                </p>
              </div>

              {/* High-visibility Action Button to open camera */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isProcessingPhoto}
                className="w-full max-w-xs py-3 px-4 rounded-2xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-slate-950 font-bold text-sm shadow-xl shadow-sky-500/25 flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-95"
              >
                <Camera size={18} />
                <span>{isProcessingPhoto ? "Reading Barcode..." : "Snap Barcode with Camera"}</span>
              </button>
            </div>
          )}
        </div>

        {/* Primary Snap Button (always accessible even when video is streaming) */}
        {cameraActive && (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isProcessingPhoto}
            className="w-full py-3 px-4 rounded-2xl bg-white/10 hover:bg-white/15 text-white font-semibold text-xs border border-white/10 shadow-lg flex items-center justify-center gap-2 cursor-pointer transition-all"
          >
            <Camera size={16} className="text-sky-400" />
            <span>{isProcessingPhoto ? "Processing Photo..." : "Or Take High-Res Photo"}</span>
          </button>
        )}

        {/* Photo Decode Error Toast */}
        {photoError && (
          <div className="p-3 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2 animate-in fade-in">
            <AlertCircle size={16} className="shrink-0 text-rose-400" />
            <span>{photoError}</span>
          </div>
        )}

        {/* Last Scanned Code Banner */}
        {lastScannedCode && (
          <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-between animate-in fade-in">
            <div className="flex items-center gap-2.5">
              <CheckCircle2 size={18} className="text-emerald-400 shrink-0" />
              <div>
                <span className="text-[10px] uppercase font-mono text-emerald-400 tracking-wider block">
                  Transmitted to Desktop PC
                </span>
                <span className="text-base font-extrabold font-mono text-white tracking-tight">
                  {lastScannedCode}
                </span>
              </div>
            </div>
            <span className="text-[10px] font-mono text-emerald-400 px-2 py-1 rounded bg-emerald-500/20 font-bold">
              SENT ✓
            </span>
          </div>
        )}

        {/* Manual Barcode / SKU Entry Box */}
        <form onSubmit={handleManualSubmit} className="space-y-1.5">
          <label className="text-[11px] font-mono text-slate-400 flex items-center justify-between px-1">
            <span>Manual Barcode / Part Code Input:</span>
            <span className="text-[10px] text-sky-400">Instant Send</span>
          </label>
          <div className="relative flex items-center">
            <Barcode size={18} className="absolute left-3.5 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value)}
              placeholder="e.g. 8901234009083 or 01721K0LD00"
              className="w-full h-12 pl-10 pr-12 rounded-2xl bg-white/5 border border-white/10 text-sm font-mono text-white placeholder-slate-500 focus:outline-none focus:border-sky-400 focus:ring-1 focus:ring-sky-400"
            />
            <button
              type="submit"
              disabled={!manualCode.trim()}
              className="absolute right-2 p-2 rounded-xl bg-sky-500 hover:bg-sky-400 disabled:opacity-30 disabled:pointer-events-none text-slate-950 transition-colors"
            >
              <Send size={15} />
            </button>
          </div>
        </form>

        {/* Optional Android Chrome Continuous Video Mode Accordion */}
        <div className="rounded-2xl bg-white/[0.02] border border-white/5 overflow-hidden">
          <button
            type="button"
            onClick={() => setShowAndroidHelp((v) => !v)}
            className="w-full p-3 flex items-center justify-between text-left text-xs font-mono text-slate-400 hover:text-white transition-colors"
          >
            <span className="flex items-center gap-1.5">
              <Sparkles size={14} className="text-sky-400" />
              Want live continuous auto-scanning without tapping Snap?
            </span>
            {showAndroidHelp ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>

          {showAndroidHelp && (
            <div className="p-3 pt-0 text-[11px] text-slate-400 space-y-2 font-sans border-t border-white/5">
              <p>
                Mobile browsers block live video streams on unencrypted HTTP. To enable continuous live video:
              </p>
              <ol className="list-decimal list-inside space-y-1 text-slate-300 font-mono text-[10px]">
                <li>In Chrome on Android, open: <code className="text-sky-300">chrome://flags/#unsafely-treat-insecure-origin-as-secure</code></li>
                <li>Enter: <code className="text-sky-300">http://192.168.1.9:3000,http://192.168.1.9:8001</code></li>
                <li>Set dropdown to <strong className="text-emerald-400">Enabled</strong> & tap <strong className="text-emerald-400">Relaunch</strong>.</li>
              </ol>
              <p className="text-[10px] text-slate-500">
                Or on PC with a webcam, open <code className="text-sky-300">http://localhost:3000/scan</code> directly.
              </p>
            </div>
          )}
        </div>

        {/* Session Scan History List */}
        <div className="flex-1 space-y-2">
          <div className="flex items-center justify-between px-1 text-xs font-mono text-slate-400">
            <span>Session History ({scanHistory.length})</span>
            {scanHistory.length > 0 && (
              <button
                onClick={() => setScanHistory([])}
                className="text-[10px] hover:text-white transition-colors"
              >
                Clear
              </button>
            )}
          </div>

          <div className="space-y-1.5 max-h-48 overflow-y-auto no-scrollbar">
            {scanHistory.length > 0 ? (
              scanHistory.map((item, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.03] border border-white/5 text-xs font-mono"
                >
                  <span className="text-slate-200 font-semibold">{item.code}</span>
                  <span className="text-[10px] text-slate-500">{item.time}</span>
                </div>
              ))
            ) : (
              <div className="p-4 rounded-xl border border-dashed border-white/5 text-center text-xs text-slate-500 font-mono">
                No items scanned yet in this session.
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Bottom Sticky Action Footer */}
      <footer className="p-4 bg-slate-900/90 backdrop-blur-md border-t border-white/10 flex items-center justify-between gap-3 sticky bottom-0">
        <div className="text-xs font-mono text-slate-400">
          <span>Continuous Mode: </span>
          <span className="text-emerald-400 font-bold">ACTIVE</span>
        </div>
        <button
          onClick={() => {
            if (wsRef.current) wsRef.current.close();
            window.close();
          }}
          className="px-4 py-2 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-400 text-xs font-bold border border-rose-500/30 transition-colors"
        >
          Stop Scanning
        </button>
      </footer>
    </div>
  );
}

export default function MobileScanPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400 font-mono text-xs">
          Loading Scanner...
        </div>
      }
    >
      <ScannerContent />
    </Suspense>
  );
}
