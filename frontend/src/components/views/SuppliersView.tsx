"use client";

import React, { useState, useEffect, useRef } from "react";
import { Supplier, SparePart } from "@/types";
import { formatRupees } from "@/utils/formatters";
import { matchSearchTokens } from "@/utils/search";
import { suppliersApi, importsApi, ImportSummaryResponse } from "@/api";
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
} from "lucide-react";

interface SuppliersViewProps {
  onRefreshCatalog?: () => void;
}

export default function SuppliersView({ onRefreshCatalog }: SuppliersViewProps) {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [loadError, setLoadError] = useState<string | null>(null);

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

  // Upload Excel Under Specific Supplier Modal States
  const [uploadSupplier, setUploadSupplier] = useState<Supplier | null>(null);
  const [uploadBrandOverride, setUploadBrandOverride] = useState("");
  const [uploadDiscountOverride, setUploadDiscountOverride] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [uploadSummary, setUploadSummary] = useState<ImportSummaryResponse | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 1. Load live suppliers on mount
  const loadSuppliers = async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const data = await suppliersApi.getAll();
      setSuppliers(data);
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
    setSupplierModalError(null);
    setShowSupplierModal(true);
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

  // Parts filtered by search inside viewing modal
  const filteredSupplierParts = supplierParts.filter((p) => {
    const target = `${p.name} ${p.partNumber} ${p.brand} ${p.compatibleBikes} ${p.modelNumber} ${p.rackNumber}`;
    return matchSearchTokens(target, partsSearchQuery);
  });

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
                    <Percent size={11} /> {supplier.defaultDiscountPercentage || 0}% Purchase Disc
                  </span>
                  <span className="inline-flex items-center gap-1 text-[11px] font-mono px-2.5 py-1 rounded-lg bg-sky-500/10 border border-sky-400/20 text-sky-300 font-semibold">
                    <Package size={11} /> {supplier.totalPartsCount || 0} Parts Mapped
                  </span>
                </div>

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

            {/* Search Filter Inside Parts */}
            <div className="relative shrink-0">
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

            {/* Parts Table */}
            <div className="flex-1 overflow-y-auto rounded-2xl border border-white/10">
              {isLoadingParts ? (
                <div className="p-12 text-center text-slate-400 text-xs font-mono">
                  <div className="w-6 h-6 border-2 border-sky-400 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                  Loading inventory items for {viewingSupplier.name}...
                </div>
              ) : filteredSupplierParts.length === 0 ? (
                <div className="p-10 text-center text-slate-400 text-xs">
                  No parts found for this supplier. Use "Upload Bill" to import items under {viewingSupplier.name}.
                </div>
              ) : (
                <table className="w-full text-left text-xs font-sans min-w-[750px]">
                  <thead className="bg-white/[0.04] text-slate-400 font-mono uppercase text-[10px] sticky top-0 backdrop-blur-md border-b border-white/10">
                    <tr>
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
