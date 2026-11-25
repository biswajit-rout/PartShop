"use client";

import React, { useState, useEffect } from "react";
import { NavigationSection, SparePart } from "@/types";
import { initialProducts } from "@/data/mock-data";
import { partsApi, authApi, UserProfile } from "@/api";

// Liquid Glass Layout Primitives
import LiquidBackground from "@/components/ui/glass/LiquidBackground";
import GlassSidebar from "@/components/layout/GlassSidebar";
import GlassHeader from "@/components/layout/GlassHeader";

// Modular Domain Views
import LoginView from "@/components/views/LoginView";
import DashboardView from "@/components/views/DashboardView";
import InventoryView from "@/components/views/InventoryView";
import BillingView from "@/components/views/BillingView";
import SuppliersView from "@/components/views/SuppliersView";
import MechanicsView from "@/components/views/MechanicsView";
import ReportsView from "@/components/views/ReportsView";
import SettingsView from "@/components/views/SettingsView";

export default function Home() {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [authChecked, setAuthChecked] = useState(false);

  const [currentSection, setCurrentSection] =
    useState<NavigationSection>("Dashboard");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [globalSearch, setGlobalSearch] = useState("");
  const [products, setProducts] = useState<SparePart[]>(initialProducts);
  const [isLiveConnected, setIsLiveConnected] = useState(false);

  // 1. Session check on initial mount
  useEffect(() => {
    async function verifySession() {
      if (authApi.isAuthenticated()) {
        try {
          const profile = await authApi.getMe();
          setCurrentUser(profile);
        } catch {
          authApi.logout();
          setCurrentUser(null);
        }
      }
      setAuthChecked(true);
    }
    verifySession();
  }, []);

  // 2. Fetch live spare parts catalog once authenticated
  useEffect(() => {
    if (!currentUser) return;

    let isMounted = true;
    async function loadCatalog() {
      try {
        const liveParts = await partsApi.getAll();
        if (isMounted && liveParts.length > 0) {
          setProducts(liveParts);
          setIsLiveConnected(true);
        }
      } catch (err) {
        console.warn("FastAPI backend not reachable; running in fallback mode:", err);
      }
    }
    loadCatalog();
    return () => {
      isMounted = false;
    };
  }, [currentUser]);

  const refreshCatalog = async () => {
    try {
      const liveParts = await partsApi.getAll();
      if (liveParts && liveParts.length > 0) {
        setProducts(liveParts);
        setIsLiveConnected(true);
      }
    } catch (err) {
      console.warn("Failed to refresh catalog from PostgreSQL:", err);
    }
  };

  const handleLogout = () => {
    authApi.logout();
    setCurrentUser(null);
  };

  // Loading splash while checking session
  if (!authChecked) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <LiquidBackground />
        <div className="text-center z-10">
          <div className="w-10 h-10 border-2 border-sky-400 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-xs text-slate-400 font-mono">Initializing POS Terminal...</p>
        </div>
      </div>
    );
  }

  // Render Login View if not authenticated
  if (!currentUser) {
    return (
      <div className="min-h-screen text-slate-100 relative selection:bg-sky-500/30 selection:text-white">
        <LiquidBackground />
        <LoginView onLoginSuccess={(user) => setCurrentUser(user)} />
      </div>
    );
  }

  // Render Authenticated POS Terminal Canvas
  return (
    <div className="min-h-screen text-slate-100 relative selection:bg-sky-500/30 selection:text-white">
      {/* Dynamic Liquid Mesh Glow Background */}
      <LiquidBackground />

      {/* Floating Liquid Glass Sidebar */}
      <GlassSidebar
        currentSection={currentSection}
        onSelectSection={setCurrentSection}
        isOpen={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
      />

      {/* Main App Canvas */}
      <div className="lg:pl-[272px] flex flex-col min-h-screen">
        {/* Sticky Top Glass Header */}
        <GlassHeader
          onOpenMobileMenu={() => setMobileMenuOpen(true)}
          searchQuery={globalSearch}
          onSearchChange={setGlobalSearch}
          onQuickBillClick={() => setCurrentSection("Billing")}
        />

        {/* Viewport Container */}
        <main className="flex-1 max-w-[1520px] w-full mx-auto px-4 sm:px-6 lg:px-8 pb-12">
          {currentSection === "Dashboard" && (
            <DashboardView
              products={products}
              onNavigate={setCurrentSection}
            />
          )}

          {currentSection === "Inventory" && (
            <InventoryView
              products={products}
              searchQuery={globalSearch}
              onSearchChange={setGlobalSearch}
              onRefreshCatalog={refreshCatalog}
            />
          )}

          {currentSection === "Billing" && (
            <BillingView
              products={products}
              onCheckoutSuccess={refreshCatalog}
            />
          )}

          {currentSection === "Suppliers" && <SuppliersView />}

          {currentSection === "Mechanics" && <MechanicsView />}

          {currentSection === "Reports" && <ReportsView />}

          {currentSection === "Settings" && <SettingsView />}
        </main>
      </div>
    </div>
  );
}
