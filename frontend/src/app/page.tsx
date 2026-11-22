"use client";

import React, { useState } from "react";
import { NavigationSection } from "@/types";
import { initialProducts } from "@/data/mock-data";

// Liquid Glass Layout Primitives
import LiquidBackground from "@/components/ui/glass/LiquidBackground";
import GlassSidebar from "@/components/layout/GlassSidebar";
import GlassHeader from "@/components/layout/GlassHeader";

// Modular Domain Views
import DashboardView from "@/components/views/DashboardView";
import InventoryView from "@/components/views/InventoryView";
import BillingView from "@/components/views/BillingView";
import SuppliersView from "@/components/views/SuppliersView";
import MechanicsView from "@/components/views/MechanicsView";
import ReportsView from "@/components/views/ReportsView";
import SettingsView from "@/components/views/SettingsView";

export default function Home() {
  const [currentSection, setCurrentSection] =
    useState<NavigationSection>("Dashboard");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [globalSearch, setGlobalSearch] = useState("");
  const [products] = useState(initialProducts);

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
            />
          )}

          {currentSection === "Billing" && (
            <BillingView products={products} />
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
