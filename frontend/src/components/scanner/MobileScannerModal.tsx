"use client";

import React from "react";
import { useScannerSession } from "@/context/ScannerContext";
import { scannerApi } from "@/api";
import GlassButton from "@/components/ui/glass/GlassButton";
import {
  Smartphone,
  X,
  RotateCcw,
  ExternalLink,
  Wifi,
  AlertTriangle,
  CheckCircle2,
  Users,
  Barcode,
  Layers,
} from "lucide-react";

export default function MobileScannerModal() {
  const {
    sessionId,
    hostIp,
    setHostIp,
    allHostIps,
    connectedDevices,
    isPhoneConnected,
    isModalOpen,
    setIsModalOpen,
    generateNewSession,
  } = useScannerSession();

  if (!isModalOpen) return null;

  const isDocker = scannerApi.isDockerInternalIp(hostIp);
  const effectiveHostIp = isDocker || !hostIp || hostIp === "localhost" || hostIp === "127.0.0.1" ? "192.168.1.9" : hostIp;
  const mobileScanUrl = `http://${effectiveHostIp}:3000/scan?sid=${sessionId}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in">
      <div className="glass-panel w-full max-w-lg p-6 rounded-3xl border border-sky-500/30 bg-slate-900/95 shadow-2xl relative space-y-4 max-h-[92vh] overflow-y-auto no-scrollbar">
        {/* Close Button */}
        <button
          onClick={() => setIsModalOpen(false)}
          className="absolute top-4 right-4 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          aria-label="Close modal"
        >
          <X size={18} />
        </button>

        {/* Modal Header */}
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Smartphone className="text-sky-400" size={20} />
            <h3 className="text-lg font-bold text-white">Connect Mobile Scanner</h3>
          </div>
          <p className="text-xs text-slate-400">
            Scan this QR code with your smartphone camera to link it as a wireless barcode reader.
          </p>
        </div>

        {/* Live Multi-Device Connection Beacon */}
        <div
          className={`p-3 rounded-2xl border flex items-center justify-between text-xs font-mono transition-all ${
            isPhoneConnected
              ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.15)]"
              : "bg-amber-500/10 border-amber-500/20 text-amber-300"
          }`}
        >
          <div className="flex items-center gap-2">
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                isPhoneConnected ? "bg-emerald-400 animate-pulse" : "bg-amber-400 animate-ping"
              }`}
            />
            <span className="font-semibold">
              {isPhoneConnected
                ? `🟢 ${connectedDevices.length} Phone${connectedDevices.length > 1 ? "s" : ""} Connected & Ready`
                : "Waiting for phone to scan QR..."}
            </span>
          </div>
          <span className="text-[10px] text-slate-400">WS Port: 8001</span>
        </div>

        {/* Pairing QR Code Container */}
        <div className="flex flex-col items-center justify-center p-4 rounded-2xl bg-white/5 border border-white/10 text-center">
          <div className="p-3 rounded-xl bg-white shadow-xl">
            <img
              src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(
                mobileScanUrl
              )}`}
              alt="Pairing QR Code"
              className="w-44 h-44 object-contain"
            />
          </div>

          {/* Host PC Wi-Fi IP Controls */}
          <div className="mt-3.5 w-full space-y-2 text-left">
            {isDocker && (
              <div className="p-2.5 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-200 text-xs space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 font-bold text-amber-300">
                    <AlertTriangle size={14} className="shrink-0" />
                    <span>Docker Internal IP Detected ({hostIp})</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setHostIp("192.168.1.9")}
                    className="px-2 py-0.5 rounded bg-sky-500/20 hover:bg-sky-500/30 text-sky-300 border border-sky-500/40 font-mono text-[11px] font-bold cursor-pointer"
                  >
                    Fix to 192.168.1.9
                  </button>
                </div>
                <p className="text-[11px] text-amber-300/80 leading-snug">
                  Smartphones cannot reach Docker container bridge IPs. Please use your PC&apos;s physical Wi-Fi IP (<code>192.168.1.9</code>).
                </p>
              </div>
            )}

            <div className="flex items-center justify-between">
              <label className="text-[11px] font-mono text-slate-300 font-semibold flex items-center gap-1.5">
                <Wifi size={13} className="text-sky-400" />
                Host PC Wi-Fi / LAN IP:
              </label>
              <span className="text-[10px] text-slate-400 font-mono">Port 3000 & 8001</span>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="text"
                value={hostIp}
                onChange={(e) => setHostIp(e.target.value)}
                placeholder="e.g. 192.168.1.9"
                className="glass-input h-9 flex-1 px-3 rounded-xl text-xs font-mono text-sky-300 font-bold focus:border-sky-400"
              />
              {allHostIps
                .filter((ip) => !scannerApi.isDockerInternalIp(ip))
                .slice(0, 2)
                .map((ip) => (
                  <button
                    key={ip}
                    type="button"
                    onClick={() => setHostIp(ip)}
                    className={`text-[11px] font-mono px-2.5 py-1.5 rounded-lg border transition-colors cursor-pointer shrink-0 ${
                      hostIp === ip
                        ? "bg-sky-500/25 text-sky-200 border-sky-400 font-bold"
                        : "bg-sky-500/15 hover:bg-sky-500/25 text-sky-300 border-sky-500/30"
                    }`}
                  >
                    {ip}
                  </button>
                ))}
              <button
                type="button"
                onClick={() => setHostIp("localhost")}
                className={`text-[11px] font-mono px-2 py-1.5 rounded-lg border transition-colors cursor-pointer shrink-0 ${
                  hostIp === "localhost"
                    ? "bg-white/20 text-white border-white/30 font-bold"
                    : "bg-white/5 hover:bg-white/10 text-slate-300 border-white/10"
                }`}
              >
                localhost
              </button>
            </div>

            {/* Mobile Scan URL */}
            <div className="pt-1">
              <span className="text-[10px] font-mono text-slate-400 block mb-0.5">Mobile Web URL:</span>
              <div className="flex items-center justify-between gap-2 text-xs font-mono text-sky-300 bg-black/40 py-1.5 px-3 rounded-xl border border-white/5 break-all">
                <span className="truncate">{mobileScanUrl}</span>
                <a
                  href={mobileScanUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="p-1 text-slate-400 hover:text-white shrink-0"
                  title="Open in new tab to test"
                >
                  <ExternalLink size={13} />
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Connected Devices Roster (Supports Multiple Users) */}
        <div className="space-y-2 p-3.5 rounded-2xl bg-white/[0.03] border border-white/10">
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="text-white font-bold flex items-center gap-1.5">
              <Users size={14} className="text-sky-400" />
              Connected Scanners ({connectedDevices.length})
            </span>
            <span className="text-[10px] text-slate-400">Multiple phones supported</span>
          </div>

          {connectedDevices.length > 0 ? (
            <div className="space-y-2 pt-1">
              {connectedDevices.map((device, idx) => (
                <div
                  key={device.device_id || idx}
                  className="p-2.5 rounded-xl bg-black/30 border border-white/5 flex items-center justify-between text-xs font-mono"
                >
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                    <div>
                      <span className="text-white font-semibold block">{device.device_name}</span>
                      <span className="text-[10px] text-slate-400 block">
                        Connected {new Date(device.connected_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="px-2 py-0.5 rounded-md bg-sky-500/15 text-sky-300 text-[10px] font-bold border border-sky-500/25">
                      {device.scan_count} scans
                    </span>
                    <span className="text-[10px] text-emerald-400 block mt-0.5">Active</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-[11px] text-slate-400 italic py-1">
              No phones connected yet. Point your camera at the QR code above to link your phone.
            </p>
          )}
        </div>

        {/* Background Persistence Note */}
        <div className="p-2.5 rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-300 text-[11px] flex items-start gap-2">
          <CheckCircle2 size={15} className="shrink-0 text-sky-400 mt-0.5" />
          <span>
            <strong>Background Active:</strong> Closing this popup keeps your phone connected. Any barcode scanned on your phone will instantly appear on your desktop screen!
          </span>
        </div>

        {/* Bottom Actions */}
        <div className="flex items-center justify-between gap-3 pt-1">
          <button
            type="button"
            onClick={generateNewSession}
            className="text-xs font-mono text-slate-400 hover:text-white flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Generate new session key and disconnect previous phones"
          >
            <RotateCcw size={13} />
            <span>New Session</span>
          </button>

          <GlassButton variant="primary" size="sm" onClick={() => setIsModalOpen(false)}>
            Close & Keep Scanning
          </GlassButton>
        </div>
      </div>
    </div>
  );
}
