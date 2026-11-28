"use client";

import React, { useState } from "react";
import { authApi, UserProfile } from "@/api";
import GlassCard from "@/components/ui/glass/GlassCard";
import GlassButton from "@/components/ui/glass/GlassButton";
import GlassInput from "@/components/ui/glass/GlassInput";
import GlassBadge from "@/components/ui/glass/GlassBadge";
import { Wrench, Lock, User, LogIn, AlertCircle, Sparkles, ShieldCheck } from "lucide-react";

interface LoginViewProps {
  onLoginSuccess: (user: UserProfile) => void;
}

export default function LoginView({ onLoginSuccess }: LoginViewProps) {
  const [username, setUsername] = useState("cashier1");
  const [password, setPassword] = useState("Password123!");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setErrorMessage("Please enter both username and password.");
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      // 1. Authenticate against FastAPI backend (POST /api/v1/auth/login)
      await authApi.login(username.trim(), password);

      // 2. Fetch authenticated staff profile (GET /api/v1/auth/me)
      const profile = await authApi.getMe();
      onLoginSuccess(profile);
    } catch (err: any) {
      setErrorMessage(
        err.message || "Failed to sign in. Please verify your credentials and ensure the backend is running."
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickFill = (role: "cashier" | "admin") => {
    if (role === "cashier") {
      setUsername("cashier1");
      setPassword("Password123!");
    } else {
      setUsername("admin");
      setPassword("AdminPassword123!");
    }
    setErrorMessage(null);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative z-10">
      <div className="w-full max-w-md">
        {/* Brand Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-sky-400 to-indigo-600 text-white shadow-[0_0_25px_rgba(56,189,248,0.4)] mb-4">
            <Wrench size={26} className="rotate-45" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center justify-center gap-2">
            PartShop <span className="text-sky-400">ERP</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Motorcycle Spare Parts & Point-of-Sale Terminal
          </p>
        </div>

        {/* Login Card */}
        <GlassCard className="p-6 sm:p-8 backdrop-blur-xl border-white/15 shadow-2xl">
          <div className="flex items-center justify-between mb-6 pb-4 border-b border-white/10">
            <div>
              <h2 className="text-base font-semibold text-white">Counter Sign In</h2>
              <p className="text-[11px] text-slate-400">Enter your employee credentials to start session</p>
            </div>
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-sky-500/15 border border-sky-400/30 text-sky-300 text-xs font-mono font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-pulse" />
              API: 8001
            </div>
          </div>

          {errorMessage && (
            <div className="mb-5 p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 flex items-start gap-2.5 text-xs text-rose-300">
              <AlertCircle size={16} className="shrink-0 mt-0.5 text-rose-400" />
              <span>{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <GlassInput
              label="Username / Staff ID"
              placeholder="e.g. cashier1"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              icon={<User size={16} />}
              required
              autoFocus
            />

            <GlassInput
              label="Security Password"
              type="password"
              placeholder="••••••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              icon={<Lock size={16} />}
              required
            />

            <div className="pt-2">
              <GlassButton
                type="submit"
                variant="primary"
                size="lg"
                className="w-full"
                disabled={isLoading}
                icon={isLoading ? <Sparkles size={16} className="animate-spin" /> : <LogIn size={16} />}
              >
                {isLoading ? "Authenticating Session..." : "Sign In to Terminal"}
              </GlassButton>
            </div>
          </form>

          {/* Quick Fill Credentials for Testing */}
          <div className="mt-6 pt-5 border-t border-white/10 text-center">
            <div className="text-[11px] text-slate-400 mb-2 font-mono flex items-center justify-center gap-1">
              <ShieldCheck size={12} className="text-sky-400" />
              Quick Demo Accounts
            </div>
            <div className="flex items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => handleQuickFill("cashier")}
                className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-[11px] font-mono text-slate-300 transition-colors cursor-pointer"
              >
                Cashier (cashier1)
              </button>
              <button
                type="button"
                onClick={() => handleQuickFill("admin")}
                className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-[11px] font-mono text-slate-300 transition-colors cursor-pointer"
              >
                Admin (admin)
              </button>
            </div>
          </div>
        </GlassCard>

        {/* Security Footer */}
        <div className="text-center mt-6 text-[11px] text-slate-500 font-mono">
          Protected by JWT Bearer Authentication · PartShop POS v1.0
        </div>
      </div>
    </div>
  );
}
