"use client";

import React, { useState, useRef, useEffect } from "react";
import { SparePart, Brand } from "@/types";
import { formatRupees } from "@/utils/formatters";
import { matchSearchTokens } from "@/utils/search";
import { importsApi, partsApi, brandsApi, ImportSummaryResponse } from "@/api";
import PageHeading from "@/components/common/PageHeading";
import GlassBadge from "@/components/ui/glass/GlassBadge";
import GlassButton from "@/components/ui/glass/GlassButton";
import GlassInput from "@/components/ui/glass/GlassInput";
import GlassCard from "@/components/ui/glass/GlassCard";
import {
  Search,
  Download,
  Upload,
  Plus,
  Filter,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  X,
  Edit2,
  Tag,
  Layers,
  Wrench,
} from "lucide-react";

interface InventoryViewProps {
  products: SparePart[];
  searchQuery: string;
  onSearchChange: (value: string) => void;
  onRefreshCatalog?: () => void;
}

export default function InventoryView({
  products,
  searchQuery,
  onSearchChange,
  onRefreshCatalog,
}: InventoryViewProps) {
  const [selectedBrand, setSelectedBrand] = useState<string>("All");
  const [selectedStatus, setSelectedStatus] = useState<string>("All");

  // Excel Bulk Import States
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [importSummary, setImportSummary] = useState<ImportSummaryResponse | null>(null);
  const [importError, setImportError] = useState<string | null>(null);

  // Live Brands Master
  const [availableBrands, setAvailableBrands] = useState<Brand[]>([]);
  const [showBrandsModal, setShowBrandsModal] = useState(false);
  const [newBrandName, setNewBrandName] = useState("");
  const [newBrandCode, setNewBrandCode] = useState("");
  const [newBrandDesc, setNewBrandDesc] = useState("");
  const [isAddingBrand, setIsAddingBrand] = useState(false);
  const [brandError, setBrandError] = useState<string | null>(null);

  // Manual Add Part Modal States
  const [showAddModal, setShowAddModal] = useState(false);
  const [isSubmittingPart, setIsSubmittingPart] = useState(false);
  const [addPartError, setAddPartError] = useState<string | null>(null);
  const [newPart, setNewPart] = useState({
    item_name: "",
    brand_name: "Hero",
    part_number: "",
    model_number: "",
    compatible_bikes: "",
    rack_number: "",
    purchase_price: "",
    selling_price: "",
    quantity: "0",
    barcode: "",
  });

  // Edit Part Modal States
  const [editingPart, setEditingPart] = useState<SparePart | null>(null);
  const [isUpdatingPart, setIsUpdatingPart] = useState(false);
  const [editPartError, setEditPartError] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    item_name: "",
    brand_name: "",
    part_number: "",
    model_number: "",
    compatible_bikes: "",
    rack_number: "",
    purchase_price: "",
    selling_price: "",
    quantity: "0",
    barcode: "",
  });

  // Load brands master on mount
  useEffect(() => {
    async function loadBrands() {
      try {
        const brands = await brandsApi.getAll();
        if (brands && brands.length > 0) {
          setAvailableBrands(brands);
        }
      } catch (err) {
        console.warn("Could not fetch brands master:", err);
      }
    }
    loadBrands();
  }, []);

  // Tokenized multi-attribute search filter with automotive synonym expansion
  const filteredProducts = products.filter((item) => {
    const searchTarget = `${item.name} ${item.brand} ${item.partNumber} ${item.modelNumber} ${item.compatibleBikes} ${item.rackNumber} ${item.barcode}`;
    const matchesSearch = matchSearchTokens(searchTarget, searchQuery);
    const matchesBrand =
      selectedBrand === "All" || item.brand.toLowerCase() === selectedBrand.toLowerCase();
    const matchesStatus =
      selectedStatus === "All" || item.status === selectedStatus;
    return matchesSearch && matchesBrand && matchesStatus;
  });

  // Handle Real Excel Upload
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setImportError(null);
    setImportSummary(null);

    try {
      const summary = await importsApi.uploadCatalogExcel(file);
      setImportSummary(summary);
      if (onRefreshCatalog) {
        onRefreshCatalog();
      }
    } catch (err: any) {
      setImportError(err.message || "Failed to process Excel workbook.");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  // Handle Manual Add Part Submit
  const handleAddPartSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPart.item_name || !newPart.part_number || !newPart.selling_price) {
      setAddPartError("Item Name, Part Number, and Selling Price are required.");
      return;
    }

    setIsSubmittingPart(true);
    setAddPartError(null);

    try {
      await partsApi.create({
        item_name: newPart.item_name,
        brand_name: newPart.brand_name,
        part_number: newPart.part_number,
        model_number: newPart.model_number || undefined,
        compatible_bikes: newPart.compatible_bikes || undefined,
        rack_number: newPart.rack_number || undefined,
        purchase_price: newPart.purchase_price || "0",
        selling_price: newPart.selling_price,
        quantity: parseInt(newPart.quantity, 10) || 0,
        barcode: newPart.barcode || undefined,
      });

      setShowAddModal(false);
      setNewPart({
        item_name: "",
        brand_name: availableBrands[0]?.name || "Hero",
        part_number: "",
        model_number: "",
        compatible_bikes: "",
        rack_number: "",
        purchase_price: "",
        selling_price: "",
        quantity: "0",
        barcode: "",
      });

      if (onRefreshCatalog) {
        onRefreshCatalog();
      }
    } catch (err: any) {
      setAddPartError(err.message || "Failed to create spare part.");
    } finally {
      setIsSubmittingPart(false);
    }
  };

  // Open Edit Modal for a part
  const handleOpenEditModal = (part: SparePart) => {
    setEditingPart(part);
    setEditForm({
      item_name: part.name,
      brand_name: part.brand,
      part_number: part.partNumber,
      model_number: part.modelNumber || "",
      compatible_bikes: part.compatibleBikes || "",
      rack_number: part.rackNumber || "",
      purchase_price: String(part.purchasePrice),
      selling_price: String(part.sellingPrice),
      quantity: String(part.quantity),
      barcode: part.barcode || "",
    });
    setEditPartError(null);
  };

  // Handle Update Part Submit
  const handleUpdatePartSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPart) return;

    setIsUpdatingPart(true);
    setEditPartError(null);

    try {
      await partsApi.update(editingPart.id, {
        item_name: editForm.item_name,
        brand_name: editForm.brand_name,
        part_number: editForm.part_number,
        model_number: editForm.model_number || undefined,
        compatible_bikes: editForm.compatible_bikes || undefined,
        rack_number: editForm.rack_number || undefined,
        purchase_price: editForm.purchase_price,
        selling_price: editForm.selling_price,
        quantity: parseInt(editForm.quantity, 10) || 0,
        barcode: editForm.barcode || undefined,
      });

      setEditingPart(null);
      if (onRefreshCatalog) {
        onRefreshCatalog();
      }
    } catch (err: any) {
      setEditPartError(err.message || "Failed to update spare part details.");
    } finally {
      setIsUpdatingPart(false);
    }
  };

  // Handle Add New Brand Submit
  const handleAddBrandSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBrandName.trim()) {
      setBrandError("Brand name cannot be blank.");
      return;
    }

    setIsAddingBrand(true);
    setBrandError(null);

    try {
      const created = await brandsApi.create({
        name: newBrandName.trim(),
        code: newBrandCode.trim() || undefined,
        description: newBrandDesc.trim() || undefined,
      });
      setAvailableBrands((prev) => [...prev, created]);
      setNewBrandName("");
      setNewBrandCode("");
      setNewBrandDesc("");
    } catch (err: any) {
      setBrandError(err.message || "Failed to save brand.");
    } finally {
      setIsAddingBrand(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Hidden File Input for .xlsx */}
      <input
        type="file"
        ref={fileInputRef}
        accept=".xlsx,.xlsm"
        onChange={handleFileChange}
        className="hidden"
      />

      <PageHeading
        title="Inventory Management"
        subtitle={`${filteredProducts.length} items listed · Real-time PostgreSQL Catalog`}
        badge="BARCODE INDEXED"
        action={
          <div className="flex flex-wrap items-center gap-2.5">
            <GlassButton
              variant="secondary"
              size="sm"
              icon={<Tag size={14} />}
              onClick={() => setShowBrandsModal(true)}
            >
              Brands ({availableBrands.length})
            </GlassButton>
            <GlassButton
              variant="secondary"
              size="sm"
              icon={isUploading ? <Sparkles size={14} className="animate-spin" /> : <Upload size={14} />}
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
            >
              {isUploading ? "Uploading Spreadsheet..." : "Import Excel (.xlsx)"}
            </GlassButton>
            <GlassButton
              variant="primary"
              size="sm"
              icon={<Plus size={14} />}
              onClick={() => setShowAddModal(true)}
            >
              + Add Part
            </GlassButton>
          </div>
        }
      />

      {/* Excel Import Success Summary Card */}
      {importSummary && (
        <div className="glass-card rounded-2xl p-5 border border-emerald-400/30 bg-emerald-500/10 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
              <div>
                <h4 className="text-sm font-bold text-white">
                  Excel Import Completed: {importSummary.filename}
                </h4>
                <p className="text-xs text-emerald-200">
                  {importSummary.imported_count} parts saved into PostgreSQL · {importSummary.skipped_count} rows skipped
                </p>
              </div>
            </div>
            <button
              onClick={() => setImportSummary(null)}
              className="text-slate-400 hover:text-white"
            >
              <X size={16} />
            </button>
          </div>

          {importSummary.errors.length > 0 && (
            <div className="mt-3 p-3 rounded-xl bg-black/40 border border-white/10 text-xs space-y-1.5 max-h-40 overflow-y-auto">
              <span className="font-bold text-amber-300 block mb-1">
                Row-Level Warnings / Duplicates:
              </span>
              {importSummary.errors.map((err, i) => (
                <div key={i} className="text-slate-300 font-mono text-[11px]">
                  • Row {err.row_number} ({err.part_number || "No Part #"}): {err.reason}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Excel Upload Error Banner */}
      {importError && (
        <div className="glass-card rounded-2xl p-4 border border-rose-500/30 bg-rose-500/10 flex items-center justify-between gap-3 text-xs text-rose-300">
          <div className="flex items-center gap-2.5">
            <AlertCircle size={18} className="text-rose-400 shrink-0" />
            <span>{importError}</span>
          </div>
          <button onClick={() => setImportError(null)} className="text-slate-400 hover:text-white">
            <X size={16} />
          </button>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="glass-panel rounded-3xl p-4 sm:p-5 flex flex-col md:flex-row items-stretch md:items-center gap-3">
        <div className="relative flex-1">
          <Search
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
            size={16}
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search by part name, part #, bike model (e.g. Pulsar, Splendor), or rack..."
            className="glass-input h-10 w-full pl-10 pr-4 rounded-xl text-xs sm:text-sm font-sans"
          />
        </div>

        {/* Brand Dropdown */}
        <div className="flex items-center gap-2">
          <Filter size={15} className="text-slate-400 shrink-0" />
          <select
            value={selectedBrand}
            onChange={(e) => setSelectedBrand(e.target.value)}
            className="glass-input h-10 px-3 rounded-xl text-xs font-mono text-slate-200 outline-none"
          >
            <option value="All" className="bg-slate-900">All Brands</option>
            {availableBrands.map((b) => (
              <option key={b.id} value={b.name} className="bg-slate-900">{b.name}</option>
            ))}
          </select>

          {/* Status Dropdown */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="glass-input h-10 px-3 rounded-xl text-xs font-mono text-slate-200 outline-none"
          >
            <option value="All" className="bg-slate-900">All Statuses</option>
            <option value="In Stock" className="bg-slate-900">In Stock</option>
            <option value="Low Stock" className="bg-slate-900">Low Stock</option>
            <option value="Out of Stock" className="bg-slate-900">Out of Stock</option>
          </select>
        </div>
      </div>

      {/* Inventory Table */}
      <div className="glass-panel rounded-3xl overflow-hidden border border-white/10">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-sans min-w-[950px]">
            <thead className="bg-white/[0.03] text-slate-400 font-mono uppercase border-b border-white/10 text-[11px]">
              <tr>
                <th className="py-3.5 px-4">Part / Description</th>
                <th className="py-3.5 px-4">Brand</th>
                <th className="py-3.5 px-4">Part #</th>
                <th className="py-3.5 px-4">Compatible Bikes</th>
                <th className="py-3.5 px-4">Rack Loc.</th>
                <th className="py-3.5 px-4">Stock Qty</th>
                <th className="py-3.5 px-4">Selling Price</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 font-mono">
              {filteredProducts.map((item) => (
                <tr
                  key={item.id}
                  className="hover:bg-white/[0.04] transition-colors"
                >
                  <td className="py-3.5 px-4 font-sans">
                    <div className="font-semibold text-white">{item.name}</div>
                    <div className="text-[11px] text-slate-400 font-mono">
                      Barcode: {item.barcode || "N/A"}
                    </div>
                  </td>
                  <td className="py-3.5 px-4">
                    <span className="px-2 py-0.5 rounded-md bg-white/10 text-slate-200 font-sans font-medium text-[11px]">
                      {item.brand}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-sky-400 font-bold">
                    {item.partNumber}
                  </td>
                  <td className="py-3.5 px-4 font-sans text-slate-300 max-w-[200px] truncate">
                    {item.compatibleBikes || "Universal"}
                  </td>
                  <td className="py-3.5 px-4">
                    <span className="px-2 py-0.5 rounded-md bg-sky-500/15 text-sky-300 border border-sky-400/25 font-bold">
                      {item.rackNumber}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 font-bold text-white text-sm">
                    {item.quantity}{" "}
                    <span className="text-xs text-slate-400 font-normal">units</span>
                  </td>
                  <td className="py-3.5 px-4 font-bold text-white text-sm">
                    {formatRupees(item.sellingPrice)}
                  </td>
                  <td className="py-3.5 px-4">
                    <GlassBadge status={item.status} />
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <GlassButton
                      size="sm"
                      variant="secondary"
                      icon={<Edit2 size={13} />}
                      onClick={() => handleOpenEditModal(item)}
                    >
                      Edit
                    </GlassButton>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Part Modal */}
      {editingPart && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
          <GlassCard className="w-full max-w-lg p-6 border-white/20 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-white/10">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Edit2 size={18} className="text-sky-400" />
                  Edit Spare Part & Pricing
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">ID #{editingPart.id} · {editingPart.name}</p>
              </div>
              <button
                onClick={() => setEditingPart(null)}
                className="text-slate-400 hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            {editPartError && (
              <div className="mb-4 p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-xs text-rose-300">
                {editPartError}
              </div>
            )}

            <form onSubmit={handleUpdatePartSubmit} className="space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <GlassInput
                  label="Item Name *"
                  value={editForm.item_name}
                  onChange={(e) => setEditForm({ ...editForm, item_name: e.target.value })}
                  required
                />
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                    Brand *
                  </label>
                  <select
                    value={editForm.brand_name}
                    onChange={(e) => setEditForm({ ...editForm, brand_name: e.target.value })}
                    className="glass-input h-10 w-full px-3 rounded-xl text-xs font-mono text-slate-200 outline-none"
                    required
                  >
                    {availableBrands.map((b) => (
                      <option key={b.id} value={b.name} className="bg-slate-900">{b.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <GlassInput
                  label="Part Number (OEM SKU) *"
                  value={editForm.part_number}
                  onChange={(e) => setEditForm({ ...editForm, part_number: e.target.value })}
                  required
                />
                <GlassInput
                  label="Model Number"
                  value={editForm.model_number}
                  onChange={(e) => setEditForm({ ...editForm, model_number: e.target.value })}
                />
              </div>

              <GlassInput
                label="Compatible Bike Models"
                value={editForm.compatible_bikes}
                onChange={(e) => setEditForm({ ...editForm, compatible_bikes: e.target.value })}
                placeholder="e.g. Hero Splendor, Passion Pro, HF Deluxe"
              />

              <div className="grid grid-cols-3 gap-3">
                <GlassInput
                  label="Stock Quantity *"
                  type="number"
                  value={editForm.quantity}
                  onChange={(e) => setEditForm({ ...editForm, quantity: e.target.value })}
                  required
                />
                <GlassInput
                  label="Purchase Rate (₹)"
                  type="number"
                  step="0.01"
                  value={editForm.purchase_price}
                  onChange={(e) => setEditForm({ ...editForm, purchase_price: e.target.value })}
                />
                <GlassInput
                  label="Selling Price (₹) *"
                  type="number"
                  step="0.01"
                  value={editForm.selling_price}
                  onChange={(e) => setEditForm({ ...editForm, selling_price: e.target.value })}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <GlassInput
                  label="Rack / Shelf Location"
                  value={editForm.rack_number}
                  onChange={(e) => setEditForm({ ...editForm, rack_number: e.target.value })}
                />
                <GlassInput
                  label="Barcode (EAN-13 / Code-128)"
                  value={editForm.barcode}
                  onChange={(e) => setEditForm({ ...editForm, barcode: e.target.value })}
                />
              </div>

              <div className="pt-3 flex justify-end gap-2.5">
                <GlassButton
                  type="button"
                  variant="secondary"
                  onClick={() => setEditingPart(null)}
                >
                  Cancel
                </GlassButton>
                <GlassButton
                  type="submit"
                  variant="primary"
                  disabled={isUpdatingPart}
                >
                  {isUpdatingPart ? "Saving Changes..." : "Save Changes"}
                </GlassButton>
              </div>
            </form>
          </GlassCard>
        </div>
      )}

      {/* Brands Master Management Modal */}
      {showBrandsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
          <GlassCard className="w-full max-w-lg p-6 border-white/20 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-white/10">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Tag size={18} className="text-sky-400" />
                Item Brands Master ({availableBrands.length})
              </h3>
              <button
                onClick={() => setShowBrandsModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            {brandError && (
              <div className="mb-4 p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-xs text-rose-300">
                {brandError}
              </div>
            )}

            {/* Add Brand Form */}
            <form onSubmit={handleAddBrandSubmit} className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 space-y-3 mb-5">
              <h4 className="text-xs font-bold text-slate-200 uppercase font-mono tracking-wider">
                + Register New Brand
              </h4>
              <div className="grid grid-cols-2 gap-2.5">
                <GlassInput
                  label="Brand Name *"
                  placeholder="e.g. Brembo"
                  value={newBrandName}
                  onChange={(e) => setNewBrandName(e.target.value)}
                  required
                />
                <GlassInput
                  label="Short Code"
                  placeholder="e.g. BREM"
                  value={newBrandCode}
                  onChange={(e) => setNewBrandCode(e.target.value)}
                />
              </div>
              <GlassInput
                label="Description"
                placeholder="e.g. High Performance Brake Systems"
                value={newBrandDesc}
                onChange={(e) => setNewBrandDesc(e.target.value)}
              />
              <div className="flex justify-end">
                <GlassButton
                  type="submit"
                  variant="primary"
                  size="sm"
                  disabled={isAddingBrand}
                >
                  {isAddingBrand ? "Saving..." : "Add Brand"}
                </GlassButton>
              </div>
            </form>

            {/* Brands List */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-slate-400 uppercase font-mono tracking-wider">
                Registered Brands Catalog
              </h4>
              <div className="divide-y divide-white/5 max-h-56 overflow-y-auto pr-1">
                {availableBrands.map((b) => (
                  <div key={b.id} className="py-2.5 flex items-center justify-between text-xs">
                    <div>
                      <span className="font-bold text-white text-sm">{b.name}</span>
                      {b.code && (
                        <span className="ml-2 px-1.5 py-0.5 rounded bg-sky-500/20 text-sky-300 font-mono text-[10px]">
                          {b.code}
                        </span>
                      )}
                      {b.description && (
                        <p className="text-[11px] text-slate-400 mt-0.5">{b.description}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </GlassCard>
        </div>
      )}

      {/* Add Part Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
          <GlassCard className="w-full max-w-lg p-6 border-white/20 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-white/10">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Plus size={18} className="text-sky-400" />
                Add New Spare Part
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            {addPartError && (
              <div className="mb-4 p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-xs text-rose-300">
                {addPartError}
              </div>
            )}

            <form onSubmit={handleAddPartSubmit} className="space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <GlassInput
                  label="Item Name *"
                  placeholder="e.g. Front Disc Pad"
                  value={newPart.item_name}
                  onChange={(e) => setNewPart({ ...newPart, item_name: e.target.value })}
                  required
                />
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                    Brand Name *
                  </label>
                  <select
                    value={newPart.brand_name}
                    onChange={(e) => setNewPart({ ...newPart, brand_name: e.target.value })}
                    className="glass-input h-10 w-full px-3 rounded-xl text-xs font-mono text-slate-200 outline-none"
                    required
                  >
                    {availableBrands.map((b) => (
                      <option key={b.id} value={b.name} className="bg-slate-900">{b.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <GlassInput
                  label="Part Number (OEM SKU) *"
                  placeholder="e.g. BP-101"
                  value={newPart.part_number}
                  onChange={(e) => setNewPart({ ...newPart, part_number: e.target.value })}
                  required
                />
                <GlassInput
                  label="Model Number"
                  placeholder="e.g. MD-2024"
                  value={newPart.model_number}
                  onChange={(e) => setNewPart({ ...newPart, model_number: e.target.value })}
                />
              </div>

              <GlassInput
                label="Compatible Bike Models"
                placeholder="e.g. Splendor Plus, Passion Pro, HF Deluxe"
                value={newPart.compatible_bikes}
                onChange={(e) => setNewPart({ ...newPart, compatible_bikes: e.target.value })}
              />

              <div className="grid grid-cols-3 gap-3">
                <GlassInput
                  label="Opening Stock *"
                  type="number"
                  placeholder="0"
                  value={newPart.quantity}
                  onChange={(e) => setNewPart({ ...newPart, quantity: e.target.value })}
                  required
                />
                <GlassInput
                  label="Purchase Rate (₹)"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={newPart.purchase_price}
                  onChange={(e) => setNewPart({ ...newPart, purchase_price: e.target.value })}
                />
                <GlassInput
                  label="Selling Price (₹) *"
                  type="number"
                  step="0.01"
                  placeholder="450.00"
                  value={newPart.selling_price}
                  onChange={(e) => setNewPart({ ...newPart, selling_price: e.target.value })}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <GlassInput
                  label="Rack / Shelf Location"
                  placeholder="e.g. Rack-B, Shelf-2"
                  value={newPart.rack_number}
                  onChange={(e) => setNewPart({ ...newPart, rack_number: e.target.value })}
                />
                <GlassInput
                  label="Barcode"
                  placeholder="e.g. 8901234001021"
                  value={newPart.barcode}
                  onChange={(e) => setNewPart({ ...newPart, barcode: e.target.value })}
                />
              </div>

              <div className="pt-3 flex justify-end gap-2.5">
                <GlassButton
                  type="button"
                  variant="secondary"
                  onClick={() => setShowAddModal(false)}
                >
                  Cancel
                </GlassButton>
                <GlassButton
                  type="submit"
                  variant="primary"
                  disabled={isSubmittingPart}
                >
                  {isSubmittingPart ? "Saving to Catalog..." : "Add to Catalog"}
                </GlassButton>
              </div>
            </form>
          </GlassCard>
        </div>
      )}
    </div>
  );
}
