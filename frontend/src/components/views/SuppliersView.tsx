"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import { Supplier, SparePart, Brand } from "@/types";
import { formatRupees } from "@/utils/formatters";
import { matchSearchTokens } from "@/utils/search";
import { suppliersApi, importsApi, brandsApi, ImportSummaryResponse } from "@/api";
import PageHeading from "@/components/common/PageHeading";
import GlassCard from "@/components/ui/glass/GlassCard";
import GlassButton from "@/components/ui/glass/GlassButton";
import GlassBadge from "@/components/ui/glass/GlassBadge";
import {
  Store,
  Phone,
  Mail,
  MapPin,
  Plus,
  Upload,
  Package,
  Edit2,
  Trash2,
  X,
  Search,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Percent,
  FileSpreadsheet,
  Layers,
  Calendar,
} from "lucide-react";

interface SuppliersViewProps {
  onRefreshCatalog?: () => void;
}

export default function SuppliersView({ onRefreshCatalog }: SuppliersViewProps) {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [loadError, setLoadError] = useState<string | null>(null);

  // Available Brands & Supplier Brand Discounts
  const [availableBrands, setAvailableBrands] = useState<Brand[]>([]);
  const [brandDiscounts, setBrandDiscounts] = useState<{ brand_id: number; discount_percentage: string }[]>([]);

  // Add / Edit Supplier Modal States
  const [showSupplierModal, setShowSupplierModal] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [isSavingSupplier, setIsSavingSupplier] = useState(false);
  const [supplierModalError, setSupplierModalError] = useState<string | null>(null);
  const [supplierForm, setSupplierForm] = useState({
    name: "",
    contact_person: "",
    phone: "",
    email: "",
    address: "",
    gst_number: "",
    default_discount_percentage: "15.00",
    is_active: true,
  });

  // View Supplied Parts Drawer / Modal States
  const [viewingSupplier, setViewingSupplier] = useState<Supplier | null>(null);
  const [supplierParts, setSupplierParts] = useState<SparePart[]>([]);
  const [isLoadingParts, setIsLoadingParts] = useState(false);
  const [partsSearchQuery, setPartsSearchQuery] = useState("");
  const [partsDateFilter, setPartsDateFilter] = useState<string>("All");

  // Upload Excel Under Specific Supplier Modal States
  const [uploadSupplier, setUploadSupplier] = useState<Supplier | null>(null);
  const [uploadBrandOverride, setUploadBrandOverride] = useState("");
  const [uploadDiscountOverride, setUploadDiscountOverride] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [uploadSummary, setUploadSummary] = useState<ImportSummaryResponse | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 1. Load live suppliers & brands on mount
  const loadSuppliers = async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const [suppliersData, brandsData] = await Promise.all([
        suppliersApi.getAll(),
        brandsApi.getAll().catch(() => []),
      ]);
      setSuppliers(suppliersData);
      setAvailableBrands(brandsData);
    } catch (err: any) {
      console.warn("Could not load suppliers:", err);
      setLoadError(err.message || "Failed to load suppliers from backend.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadSuppliers();
  }, []);

  // Filtered suppliers
  const filteredSuppliers = suppliers.filter((s) => {
    const target = `${s.name} ${s.contactPerson || s.contactName || ""} ${s.phone} ${s.gstNumber || ""} ${s.address || ""}`;
    return matchSearchTokens(target, searchQuery);
  });

  // Open modal for adding new supplier
  const handleOpenAddModal = () => {
    setEditingSupplier(null);
    setSupplierForm({
      name: "",
      contact_person: "",
      phone: "",
      email: "",
      address: "",
      gst_number: "",
      default_discount_percentage: "15.00",
      is_active: true,
    });
    setBrandDiscounts([]);
    setSupplierModalError(null);
    setShowSupplierModal(true);
  };

  // Open modal for editing existing supplier
  const handleOpenEditModal = (supplier: Supplier) => {
    setEditingSupplier(supplier);
    setSupplierForm({
      name: supplier.name,
      contact_person: supplier.contactPerson || supplier.contactName || "",
      phone: supplier.phone || supplier.mobile || "",
      email: supplier.email || "",
      address: supplier.address || "",
      gst_number: supplier.gstNumber || "",
      default_discount_percentage: String(supplier.defaultDiscountPercentage || 0),
      is_active: supplier.isActive !== undefined ? supplier.isActive : true,
    });
    setBrandDiscounts(
      (supplier.brandDiscounts || []).map((bd) => ({
        brand_id: bd.brandId,
        discount_percentage: String(bd.discountPercentage),
      }))
    );
    setSupplierModalError(null);
    setShowSupplierModal(true);
  };

  const handleAddBrandDiscountRow = () => {
    const unusedBrand = availableBrands.find(
      (b) => !brandDiscounts.some((d) => d.brand_id === b.id)
    );
    setBrandDiscounts([
      ...brandDiscounts,
      {
        brand_id: unusedBrand ? unusedBrand.id : (availableBrands[0]?.id || 0),
        discount_percentage: "20.00",
      },
    ]);
  };

  const handleUpdateBrandDiscountRow = (
    index: number,
    field: "brand_id" | "discount_percentage",
    value: string | number
  ) => {
    const updated = [...brandDiscounts];
    if (field === "brand_id") {
      updated[index].brand_id = Number(value);
    } else {
      updated[index].discount_percentage = String(value);
    }
    setBrandDiscounts(updated);
  };

  const handleRemoveBrandDiscountRow = (index: number) => {
    setBrandDiscounts(brandDiscounts.filter((_, idx) => idx !== index));
  };

  // Submit Add / Edit Supplier
  const handleSaveSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supplierForm.name.trim() || !supplierForm.phone.trim()) {
      setSupplierModalError("Supplier Name and Mobile / Phone are required.");
      return;
    }

    setIsSavingSupplier(true);
    setSupplierModalError(null);

    try {
      const payload = {
        name: supplierForm.name.trim(),
        contact_person: supplierForm.contact_person.trim() || undefined,
        phone: supplierForm.phone.trim(),
        email: supplierForm.email.trim() || undefined,
        address: supplierForm.address.trim() || undefined,
        gst_number: supplierForm.gst_number.trim() || undefined,
        default_discount_percentage: parseFloat(supplierForm.default_discount_percentage) || 0,
        is_active: supplierForm.is_active,
        brand_discounts: brandDiscounts
          .filter((d) => d.brand_id && d.discount_percentage !== "")
          .map((d) => ({
            brand_id: Number(d.brand_id),
            discount_percentage: parseFloat(d.discount_percentage) || 0,
          })),
      };

      if (editingSupplier) {
        await suppliersApi.update(editingSupplier.id, payload);
      } else {
        await suppliersApi.create(payload);
      }

      setShowSupplierModal(false);
      await loadSuppliers();
    } catch (err: any) {
      setSupplierModalError(err.message || "Failed to save supplier details.");
    } finally {
      setIsSavingSupplier(false);
    }
  };

  // Open View Parts Modal for a Supplier
  const handleOpenPartsModal = async (supplier: Supplier) => {
    setViewingSupplier(supplier);
    setPartsSearchQuery("");
    setPartsDateFilter("All");
    setIsLoadingParts(true);
    try {
      const parts = await suppliersApi.getSupplierParts(supplier.id);
      setSupplierParts(parts);
    } catch (err: any) {
      console.warn("Could not load parts for supplier:", err);
      alert(`Could not load items for ${supplier.name}: ${err.message}`);
    } finally {
      setIsLoadingParts(false);
    }
  };

  // Open Upload Excel Modal for a Supplier
  const handleOpenUploadModal = (supplier: Supplier) => {
    setUploadSupplier(supplier);
    setUploadBrandOverride("");
    setUploadDiscountOverride(String(supplier.defaultDiscountPercentage || 15));
    setUploadSummary(null);
    setUploadError(null);
  };

  // Trigger Excel file selection and upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !uploadSupplier) return;

    setIsUploading(true);
    setUploadError(null);
    setUploadSummary(null);

    try {
      const discount = parseFloat(uploadDiscountOverride);
      const summary = await importsApi.uploadCatalogExcel(
        file,
        uploadSupplier.id,
        uploadBrandOverride.trim() || undefined,
        !isNaN(discount) ? discount : undefined
      );

      setUploadSummary(summary);
      await loadSuppliers();
      if (onRefreshCatalog) {
        onRefreshCatalog();
      }
    } catch (err: any) {
      setUploadError(err.message || "Failed to upload and map spreadsheet items.");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  // Group and sort available entry dates for the viewed supplier
  const availableEntryDates = useMemo(() => {
    const datesMap = new Map<string, number>();
    supplierParts.forEach((p) => {
      const d = p.createdAt ? p.createdAt.split("T")[0] : "Earlier / Untracked";
      datesMap.set(d, (datesMap.get(d) || 0) + 1);
    });
    return Array.from(datesMap.entries()).sort((a, b) => b[0].localeCompare(a[0]));
  }, [supplierParts]);

  // Parts filtered by search AND entry date inside viewing modal
  const filteredSupplierParts = useMemo(() => {
    return supplierParts.filter((p) => {
      const entryDate = p.createdAt ? p.createdAt.split("T")[0] : "Earlier / Untracked";
      if (partsDateFilter !== "All" && entryDate !== partsDateFilter) {
        return false;
      }
      const target = `${p.name} ${p.partNumber} ${p.brand} ${p.compatibleBikes} ${p.modelNumber} ${p.rackNumber}`;
      return matchSearchTokens(target, partsSearchQuery);
    });
  }, [supplierParts, partsDateFilter, partsSearchQuery]);

  // Daily / Filtered Stock Valuation Metrics
  const supplierStockMetrics = useMemo(() => {
    const totalQty = filteredSupplierParts.reduce((acc, p) => acc + (p.quantity || 0), 0);
    const totalCostValue = filteredSupplierParts.reduce(
      (acc, p) => acc + (p.purchasePrice || 0) * (p.quantity || 0),
      0
    );
    const totalRetailValue = filteredSupplierParts.reduce(
      (acc, p) => acc + (p.sellingPrice || 0) * (p.quantity || 0),
      0
    );
    return {
      totalQty,
      totalCostValue,
      totalRetailValue,
    };
  }, [filteredSupplierParts]);

  const totalCatalogSupplied = suppliers.reduce((acc, s) => acc + (s.totalPartsCount || 0), 0);

  return (
    <div className="space-y-6">
      {/* Hidden File Input for Excel Upload */}
      <input
        type="file"
        ref={fileInputRef}
        accept=".xlsx,.xlsm"
        onChange={handleFileUpload}
        className="hidden"
      />

      <PageHeading
        title="Supplier Directory & Wholesalers"
        subtitle={`${suppliers.length} distributors registered · ${totalCatalogSupplied} items mapped with purchase discount rates`}
        badge="PURCHASE SUPPLY CHAIN"
        action={
          <GlassButton
            variant="primary"
            size="sm"
            icon={<Plus size={15} />}
            onClick={handleOpenAddModal}
          >
            + Add Supplier
          </GlassButton>
        }
      />

      {/* Global Search and Filter Bar */}
      <div className="glass-panel rounded-3xl p-4 sm:p-5 flex flex-col md:flex-row items-stretch md:items-center gap-3">
        <div className="relative flex-1">
          <Search
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
            size={16}
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search suppliers by name, contact person, mobile, or GSTIN..."
            className="glass-input h-10 w-full pl-10 pr-4 rounded-xl text-xs sm:text-sm font-sans"
          />
        </div>
      </div>

      {loadError && (
        <div className="glass-card rounded-2xl p-4 border border-rose-500/30 bg-rose-500/10 flex items-center justify-between text-xs text-rose-300">
          <div className="flex items-center gap-2">
            <AlertCircle size={16} />
            <span>{loadError}</span>
          </div>
          <button onClick={loadSuppliers} className="underline text-sky-400 hover:text-sky-300">
            Retry
          </button>
        </div>
      )}

      {/* Suppliers Card Grid */}
      {isLoading ? (
        <div className="p-12 text-center text-slate-400 font-mono text-xs">
          <div className="w-8 h-8 border-2 border-sky-400 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          Loading wholesale suppliers...
        </div>
      ) : filteredSuppliers.length === 0 ? (
        <div className="glass-panel rounded-3xl p-12 text-center text-slate-400 text-xs">
          No suppliers matched "{searchQuery}". Click "+ Add Supplier" to register one.
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {filteredSuppliers.map((supplier) => (
            <GlassCard key={supplier.id} className="p-5 flex flex-col justify-between space-y-4 hover:border-sky-500/30 transition-all duration-300">
              <div>
                {/* Header */}
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="w-11 h-11 rounded-2xl bg-sky-500/15 border border-sky-400/25 flex items-center justify-center text-sky-400 shrink-0">
                      <Store size={22} />
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-sm font-bold text-white truncate" title={supplier.name}>
                        {supplier.name}
                      </h3>
                      <span className="text-[10px] font-mono text-slate-400 block truncate">
                        GSTIN: {supplier.gstNumber || "Unregistered"}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => handleOpenEditModal(supplier)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors shrink-0"
                    title="Edit Supplier"
                  >
                    <Edit2 size={14} />
                  </button>
                </div>

                {/* Key Metrics Chips */}
                <div className="flex flex-wrap items-center gap-2 mb-3.5">
                  <span className="inline-flex items-center gap-1 text-[11px] font-mono px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-400/20 text-emerald-300 font-semibold">
                    <Percent size={11} /> {supplier.defaultDiscountPercentage || 0}% Base Disc
                  </span>
                  <span className="inline-flex items-center gap-1 text-[11px] font-mono px-2.5 py-1 rounded-lg bg-sky-500/10 border border-sky-400/20 text-sky-300 font-semibold">
                    <Package size={11} /> {supplier.totalPartsCount || 0} Parts Mapped
                  </span>
                </div>

                {/* Multi-Brand Discounts Badges */}
                {supplier.brandDiscounts && supplier.brandDiscounts.length > 0 && (
                  <div className="mb-3.5 p-2 rounded-xl bg-black/20 border border-white/5 space-y-1">
                    <span className="text-[10px] font-mono text-slate-400 block font-semibold">
                      Brand Purchase Rates:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {supplier.brandDiscounts.map((bd) => (
                        <span
                          key={bd.brandId}
                          className="inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-md bg-sky-500/15 border border-sky-400/25 text-sky-200"
                        >
                          <span className="font-semibold text-white">{bd.brandName}</span>
                          <span className="text-emerald-400 font-bold">{bd.discountPercentage}%</span>
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Detailed Contact List */}
                <div className="space-y-2 text-xs text-slate-300 font-sans border-t border-white/10 pt-3">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Contact Person</span>
                    <span className="font-semibold text-white truncate max-w-[170px]">
                      {supplier.contactPerson || supplier.contactName || "Direct Distributor"}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400 flex items-center gap-1">
                      <Phone size={12} /> Mobile
                    </span>
                    <span className="font-mono text-sky-400 font-semibold">
                      {supplier.phone || supplier.mobile}
                    </span>
                  </div>
                  {supplier.email && (
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400 flex items-center gap-1">
                        <Mail size={12} /> Email
                      </span>
                      <span className="font-mono text-slate-300 text-[11px] truncate max-w-[170px]">
                        {supplier.email}
                      </span>
                    </div>
                  )}
                  {supplier.address && (
                    <div className="text-[11px] text-slate-400 pt-1 flex items-start gap-1">
                      <MapPin size={12} className="shrink-0 mt-0.5 text-slate-500" />
                      <span className="line-clamp-1">{supplier.address}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-white/10 flex items-center gap-2">
                <GlassButton
                  variant="secondary"
                  size="sm"
                  className="flex-1 text-xs font-semibold justify-center"
                  icon={<Package size={13} />}
                  onClick={() => handleOpenPartsModal(supplier)}
                >
                  View Items ({supplier.totalPartsCount || 0})
                </GlassButton>
                <GlassButton
                  variant="primary"
                  size="sm"
                  className="text-xs font-semibold px-3"
                  icon={<Upload size={13} />}
                  onClick={() => handleOpenUploadModal(supplier)}
                  title="Upload Excel under this supplier"
                >
                  Upload Bill
                </GlassButton>
              </div>
            </GlassCard>
          ))}
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL 1: ADD / EDIT SUPPLIER                                  */}
      {/* ============================================================ */}
      {showSupplierModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
          <div className="glass-panel w-full max-w-lg rounded-3xl p-6 border border-white/15 space-y-5 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-sky-500/20 text-sky-400 flex items-center justify-center">
                  <Store size={18} />
                </div>
                <h3 className="text-base font-bold text-white">
                  {editingSupplier ? "Edit Wholesale Supplier" : "Register New Wholesale Supplier"}
                </h3>
              </div>
              <button
                onClick={() => setShowSupplierModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            {supplierModalError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle size={15} />
                <span>{supplierModalError}</span>
              </div>
            )}

            <form onSubmit={handleSaveSupplier} className="space-y-4">
              <div>
                <label className="block text-xs font-mono text-slate-300 mb-1">
                  Supplier / Distributor Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Kalyani Honda Spares Distributorship"
                  value={supplierForm.name}
                  onChange={(e) => setSupplierForm({ ...supplierForm, name: e.target.value })}
                  className="glass-input h-10 w-full px-3.5 rounded-xl text-xs sm:text-sm font-sans"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-mono text-slate-300 mb-1">
                    Contact Person Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Rajesh Kalyani"
                    value={supplierForm.contact_person}
                    onChange={(e) => setSupplierForm({ ...supplierForm, contact_person: e.target.value })}
                    className="glass-input h-10 w-full px-3.5 rounded-xl text-xs font-sans"
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono text-slate-300 mb-1">
                    Mobile / Phone Number *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. +91 94370 12345"
                    value={supplierForm.phone}
                    onChange={(e) => setSupplierForm({ ...supplierForm, phone: e.target.value })}
                    className="glass-input h-10 w-full px-3.5 rounded-xl text-xs font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-mono text-slate-300 mb-1">
                    Default Purchase Discount (%) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    required
                    placeholder="e.g. 14.50"
                    value={supplierForm.default_discount_percentage}
                    onChange={(e) =>
                      setSupplierForm({ ...supplierForm, default_discount_percentage: e.target.value })
                    }
                    className="glass-input h-10 w-full px-3.5 rounded-xl text-xs font-mono text-emerald-400 font-bold"
                  />
                  <span className="text-[10px] text-slate-400 block mt-0.5">
                    Applied automatically to all items bought from this supplier
                  </span>
                </div>
                <div>
                  <label className="block text-xs font-mono text-slate-300 mb-1">
                    GSTIN Number
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 21AAECK1234F1Z5"
                    value={supplierForm.gst_number}
                    onChange={(e) =>
                      setSupplierForm({ ...supplierForm, gst_number: e.target.value.toUpperCase() })
                    }
                    className="glass-input h-10 w-full px-3.5 rounded-xl text-xs font-mono uppercase"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-mono text-slate-300 mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  placeholder="e.g. orders@kalyanihonda.com"
                  value={supplierForm.email}
                  onChange={(e) => setSupplierForm({ ...supplierForm, email: e.target.value })}
                  className="glass-input h-10 w-full px-3.5 rounded-xl text-xs font-sans"
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-slate-300 mb-1">
                  Physical Shop / Warehouse Address
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Plot 45, Auto Nagar, Cuttack Road"
                  value={supplierForm.address}
                  onChange={(e) => setSupplierForm({ ...supplierForm, address: e.target.value })}
                  className="glass-input w-full p-2.5 rounded-xl text-xs font-sans resize-none"
                />
              </div>

              {/* Multi-Brand Purchase Discount Matrix */}
              <div className="pt-3 border-t border-white/10 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-mono font-bold text-white flex items-center gap-1.5">
                      <Layers size={13} className="text-sky-400" />
                      Multi-Brand Purchase Discount Overrides
                    </h4>
                    <p className="text-[10px] text-slate-400">
                      Configure custom wholesale discount percentages for different brands supplied (e.g. Hero 22%, Honda 18%, Bajaj 25%).
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddBrandDiscountRow}
                    className="px-2.5 py-1 text-[11px] font-mono rounded-lg bg-sky-500/20 hover:bg-sky-500/30 text-sky-300 border border-sky-500/30 flex items-center gap-1 transition-colors cursor-pointer shrink-0"
                  >
                    <Plus size={12} /> Add Brand
                  </button>
                </div>

                {brandDiscounts.length > 0 ? (
                  <div className="space-y-2 max-h-44 overflow-y-auto pr-1">
                    {brandDiscounts.map((row, idx) => (
                      <div
                        key={idx}
                        className="flex items-center gap-2 bg-black/30 p-2 rounded-xl border border-white/5"
                      >
                        <select
                          value={row.brand_id}
                          onChange={(e) =>
                            handleUpdateBrandDiscountRow(idx, "brand_id", e.target.value)
                          }
                          className="glass-input h-8 flex-1 px-2.5 rounded-lg text-xs font-sans"
                        >
                          <option value="" disabled className="bg-slate-900">
                            Select Brand
                          </option>
                          {availableBrands.map((b) => (
                            <option key={b.id} value={b.id} className="bg-slate-900">
                              {b.name}
                            </option>
                          ))}
                        </select>
                        <div className="relative w-28 shrink-0">
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            max="100"
                            placeholder="e.g. 22"
                            value={row.discount_percentage}
                            onChange={(e) =>
                              handleUpdateBrandDiscountRow(idx, "discount_percentage", e.target.value)
                            }
                            className="glass-input h-8 w-full px-2 rounded-lg text-xs font-mono text-emerald-400 font-bold pr-6"
                          />
                          <span className="absolute right-2 top-2 text-[10px] text-slate-400">%</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveBrandDiscountRow(idx)}
                          className="p-1.5 rounded-lg text-rose-400 hover:bg-rose-500/20 transition-colors shrink-0 cursor-pointer"
                          title="Remove brand override"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-2.5 rounded-xl bg-white/[0.02] border border-dashed border-white/10 text-center">
                    <span className="text-[11px] text-slate-400">
                      No brand-specific overrides configured. All parts from this supplier will use the default {supplierForm.default_discount_percentage || 0}% discount rate.
                    </span>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-white/10">
                <GlassButton
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => setShowSupplierModal(false)}
                >
                  Cancel
                </GlassButton>
                <GlassButton
                  type="submit"
                  variant="primary"
                  size="sm"
                  disabled={isSavingSupplier}
                >
                  {isSavingSupplier ? "Saving Supplier..." : editingSupplier ? "Update Supplier" : "Create Supplier"}
                </GlassButton>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL 2: VIEW SUPPLIER'S PARTS LIST                           */}
      {/* ============================================================ */}
      {viewingSupplier && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md">
          <div className="glass-panel w-full max-w-5xl rounded-3xl p-6 border border-white/15 space-y-4 shadow-2xl max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="flex items-start justify-between border-b border-white/10 pb-4 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-sky-500/20 text-sky-400 flex items-center justify-center shrink-0">
                  <Package size={22} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    {viewingSupplier.name}
                    <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-400/25">
                      {viewingSupplier.defaultDiscountPercentage}% Default Disc
                    </span>
                  </h3>
                  <p className="text-xs text-slate-400">
                    {filteredSupplierParts.length} parts mapped to this supplier in inventory
                  </p>
                </div>
              </div>
              <button
                onClick={() => setViewingSupplier(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/10"
              >
                <X size={20} />
              </button>
            </div>

            {/* Search Filter & Date Filter Controls */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 shrink-0">
              <div className="relative flex-1">
                <Search
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                  size={15}
                />
                <input
                  type="text"
                  value={partsSearchQuery}
                  onChange={(e) => setPartsSearchQuery(e.target.value)}
                  placeholder="Search supplied parts by description, part #, model, bike model, or rack..."
                  className="glass-input h-9 w-full pl-9 pr-4 rounded-xl text-xs font-sans"
                />
              </div>

              {/* Date Filter Dropdown */}
              <div className="flex items-center gap-2 shrink-0">
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={14} />
                  <select
                    value={partsDateFilter}
                    onChange={(e) => setPartsDateFilter(e.target.value)}
                    className="glass-input h-9 pl-8 pr-3 rounded-xl text-xs font-mono text-slate-200 outline-none cursor-pointer"
                  >
                    <option value="All" className="bg-slate-900">All Entry Dates ({supplierParts.length} parts)</option>
                    {availableEntryDates.map(([dateStr, count]) => (
                      <option key={dateStr} value={dateStr} className="bg-slate-900">
                        {dateStr} ({count} items)
                      </option>
                    ))}
                  </select>
                </div>
                {partsDateFilter !== "All" && (
                  <button
                    type="button"
                    onClick={() => setPartsDateFilter("All")}
                    className="px-2.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-slate-300 text-xs font-mono transition-colors cursor-pointer"
                  >
                    Reset Date
                  </button>
                )}
              </div>
            </div>

            {/* Daily Inward Stock Valuation & Quantity Banner */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 shrink-0">
              <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/10">
                <div className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">Filtered SKUs</div>
                <div className="text-base font-bold text-white font-mono mt-0.5">{filteredSupplierParts.length} items</div>
              </div>
              <div className="p-2.5 rounded-xl bg-sky-500/10 border border-sky-400/20">
                <div className="text-[10px] font-mono text-sky-400 uppercase tracking-wider">Total Quantity</div>
                <div className="text-base font-bold text-sky-300 font-mono mt-0.5">{supplierStockMetrics.totalQty} units</div>
              </div>
              <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-400/20">
                <div className="text-[10px] font-mono text-emerald-400 uppercase tracking-wider">
                  Stock Cost Valuation
                </div>
                <div className="text-base font-bold text-emerald-300 font-mono mt-0.5">
                  {formatRupees(supplierStockMetrics.totalCostValue)}
                </div>
              </div>
              <div className="p-2.5 rounded-xl bg-purple-500/10 border border-purple-400/20">
                <div className="text-[10px] font-mono text-purple-400 uppercase tracking-wider">
                  Retail Valuation (MRP)
                </div>
                <div className="text-base font-bold text-purple-300 font-mono mt-0.5">
                  {formatRupees(supplierStockMetrics.totalRetailValue)}
                </div>
              </div>
            </div>

            {/* Parts Table */}
            <div className="flex-1 overflow-y-auto rounded-2xl border border-white/10">
              {isLoadingParts ? (
                <div className="p-12 text-center text-slate-400 text-xs font-mono">
                  <div className="w-6 h-6 border-2 border-sky-400 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                  Loading inventory items for {viewingSupplier.name}...
                </div>
              ) : filteredSupplierParts.length === 0 ? (
                <div className="p-10 text-center text-slate-400 text-xs">
                  {partsDateFilter !== "All"
                    ? `No parts found entered on ${partsDateFilter}. Try selecting another date or "All Entry Dates".`
                    : `No parts found for this supplier. Use "Upload Bill" to import items under ${viewingSupplier.name}.`}
                </div>
              ) : (
                <table className="w-full text-left text-xs font-sans min-w-[850px]">
                  <thead className="bg-white/[0.04] text-slate-400 font-mono uppercase text-[10px] sticky top-0 backdrop-blur-md border-b border-white/10">
                    <tr>
                      <th className="py-2.5 px-3">Entry Date</th>
                      <th className="py-2.5 px-3">Part # / OEM SKU</th>
                      <th className="py-2.5 px-3">Description</th>
                      <th className="py-2.5 px-3">Brand</th>
                      <th className="py-2.5 px-3">Compatible Bikes</th>
                      <th className="py-2.5 px-3 text-right">Supplier Disc</th>
                      <th className="py-2.5 px-3 text-right">Cost Price</th>
                      <th className="py-2.5 px-3 text-right">MRP (Selling)</th>
                      <th className="py-2.5 px-3 text-center">Stock</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 font-sans">
                    {filteredSupplierParts.map((item) => (
                      <tr key={item.id} className="hover:bg-white/[0.02]">
                        <td className="py-2.5 px-3 font-mono text-[11px] text-slate-400 whitespace-nowrap">
                          {item.createdAt ? new Date(item.createdAt).toLocaleDateString() : "Earlier"}
                        </td>
                        <td className="py-2.5 px-3 font-mono font-semibold text-sky-400">
                          {item.partNumber}
                        </td>
                        <td className="py-2.5 px-3 font-medium text-white max-w-[220px] truncate" title={item.name}>
                          {item.name}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-slate-300">
                          {item.brand}
                        </td>
                        <td className="py-2.5 px-3 text-slate-400 text-[11px] max-w-[180px] truncate" title={item.compatibleBikes}>
                          {item.compatibleBikes || "—"}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-right text-emerald-400 font-bold">
                          {item.supplierDiscount || viewingSupplier.defaultDiscountPercentage}%
                        </td>
                        <td className="py-2.5 px-3 font-mono text-right text-slate-300">
                          {formatRupees(item.purchasePrice)}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-right text-white font-bold">
                          {formatRupees(item.sellingPrice)}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <span
                            className={`inline-block font-mono text-[10px] px-2 py-0.5 rounded-full font-bold ${
                              item.quantity > 5
                                ? "bg-emerald-500/20 text-emerald-400"
                                : item.quantity > 0
                                ? "bg-amber-500/20 text-amber-400"
                                : "bg-rose-500/20 text-rose-400"
                            }`}
                          >
                            {item.quantity} pcs
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Footer */}
            <div className="pt-2 flex justify-between items-center text-xs text-slate-400 font-mono shrink-0">
              <span>Showing {filteredSupplierParts.length} of {supplierParts.length} items</span>
              <GlassButton variant="secondary" size="sm" onClick={() => setViewingSupplier(null)}>
                Close
              </GlassButton>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL 3: UPLOAD EXCEL FOR SUPPLIER                           */}
      {/* ============================================================ */}
      {uploadSupplier && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md">
          <div className="glass-panel w-full max-w-lg rounded-3xl p-6 border border-white/15 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-sky-500/20 text-sky-400 flex items-center justify-center">
                  <FileSpreadsheet size={18} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">
                    Import Distributor Bill / Excel
                  </h3>
                  <p className="text-xs text-sky-400 font-mono">
                    Mapping to: {uploadSupplier.name}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setUploadSupplier(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            {uploadError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle size={15} />
                <span>{uploadError}</span>
              </div>
            )}

            {uploadSummary && (
              <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-400/30 space-y-2">
                <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs">
                  <CheckCircle2 size={16} />
                  <span>Import Completed Successfully!</span>
                </div>
                <p className="text-xs text-emerald-200">
                  {uploadSummary.imported_count} items mapped and saved under <strong>{uploadSupplier.name}</strong>.
                </p>
                {uploadSummary.skipped_count > 0 && (
                  <p className="text-[11px] text-amber-300">
                    {uploadSummary.skipped_count} rows skipped (duplicates or blank part numbers).
                  </p>
                )}
              </div>
            )}

            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-mono text-slate-300 mb-1">
                    Brand Name (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Honda, Bajaj, Hero"
                    value={uploadBrandOverride}
                    onChange={(e) => setUploadBrandOverride(e.target.value)}
                    className="glass-input h-10 w-full px-3.5 rounded-xl text-xs font-sans"
                  />
                  <span className="text-[10px] text-slate-400 block mt-0.5">
                    If empty, inferred from sheet
                  </span>
                </div>
                <div>
                  <label className="block text-xs font-mono text-slate-300 mb-1">
                    Supplier Purchase Discount (%) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    placeholder="e.g. 14.50"
                    value={uploadDiscountOverride}
                    onChange={(e) => setUploadDiscountOverride(e.target.value)}
                    className="glass-input h-10 w-full px-3.5 rounded-xl text-xs font-mono font-bold text-emerald-400"
                  />
                  <span className="text-[10px] text-slate-400 block mt-0.5">
                    Default: {uploadSupplier.defaultDiscountPercentage}%
                  </span>
                </div>
              </div>

              {/* Upload Drop Zone */}
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-white/20 hover:border-sky-400/50 rounded-2xl p-6 text-center cursor-pointer transition-all bg-white/[0.02] hover:bg-sky-500/5 space-y-2"
              >
                <Upload size={28} className="mx-auto text-sky-400 animate-bounce" />
                <div className="text-xs font-semibold text-white">
                  Click to select Excel workbook (.xlsx)
                </div>
                <p className="text-[11px] text-slate-400">
                  Supports distributor bills with columns: Part Number, Description, Model Compatibility, MRP, Discount %
                </p>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-white/10">
                <GlassButton
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => setUploadSupplier(null)}
                >
                  Close
                </GlassButton>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
