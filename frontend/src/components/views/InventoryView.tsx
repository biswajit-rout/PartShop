"use client";

import React, { useState, useRef, useEffect } from "react";
import { SparePart, Brand, Supplier } from "@/types";
import { formatRupees } from "@/utils/formatters";
import { matchSearchTokens } from "@/utils/search";
import { importsApi, partsApi, brandsApi, suppliersApi, scannerApi, ImportSummaryResponse } from "@/api";
import { useScannerSession } from "@/context/ScannerContext";
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
  AlertTriangle,
  Wifi,
  Sparkles,
  X,
  Edit2,
  Tag,
  Store,
  Layers,
  Wrench,
  Percent,
  Smartphone,
  Barcode,
  Package,
  QrCode,
  ExternalLink,
  RotateCcw,
  PlusCircle,
  CheckSquare,
  Square,
  CheckCheck,
  Trash2,
  Archive,
  RefreshCw,
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
  const [selectedSupplier, setSelectedSupplier] = useState<string>("All");

  // Sub-Tab Navigation: Confirmed vs Unconfirmed Staging vs Recycle Bin
  const [activeInventoryTab, setActiveInventoryTab] = useState<"confirmed" | "unconfirmed" | "deleted">("confirmed");
  const [selectedUnconfirmedIds, setSelectedUnconfirmedIds] = useState<Set<string>>(new Set());
  const [selectedDeletedIds, setSelectedDeletedIds] = useState<Set<string>>(new Set());
  const [deletedProducts, setDeletedProducts] = useState<SparePart[]>([]);
  const [isLoadingDeleted, setIsLoadingDeleted] = useState(false);
  const [isConfirmingBulk, setIsConfirmingBulk] = useState(false);
  const [isDeletingBulk, setIsDeletingBulk] = useState(false);
  const [isRestoringBulk, setIsRestoringBulk] = useState(false);
  const [confirmToast, setConfirmToast] = useState<string | null>(null);

  // Quick Rack Assignment & Single Confirmation Modal
  const [quickRackTarget, setQuickRackTarget] = useState<SparePart | null>(null);
  const [quickRackValue, setQuickRackValue] = useState("");
  const [isConfirmingSingle, setIsConfirmingSingle] = useState(false);

  // Excel Bulk Import States
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadSupplierId, setUploadSupplierId] = useState<string>("");
  const [uploadBrandOverride, setUploadBrandOverride] = useState<string>("");
  const [uploadDiscountOverride, setUploadDiscountOverride] = useState<string>("15.00");
  const [isUploading, setIsUploading] = useState(false);
  const [importSummary, setImportSummary] = useState<ImportSummaryResponse | null>(null);
  const [importError, setImportError] = useState<string | null>(null);

  // Live Brands & Suppliers Master
  const [availableBrands, setAvailableBrands] = useState<Brand[]>([]);
  const [availableSuppliers, setAvailableSuppliers] = useState<Supplier[]>([]);
  const [showBrandsModal, setShowBrandsModal] = useState(false);
  const [newBrandName, setNewBrandName] = useState("");
  const [newBrandCode, setNewBrandCode] = useState("");
  const [newBrandDesc, setNewBrandDesc] = useState("");
  const [newBrandCustomerDisc, setNewBrandCustomerDisc] = useState("5.00");
  const [newBrandMechanicDisc, setNewBrandMechanicDisc] = useState("10.00");
  const [isAddingBrand, setIsAddingBrand] = useState(false);
  const [brandError, setBrandError] = useState<string | null>(null);
  const [editingBrandId, setEditingBrandId] = useState<number | null>(null);
  const [editBrandCustomerDisc, setEditBrandCustomerDisc] = useState("");
  const [editBrandMechanicDisc, setEditBrandMechanicDisc] = useState("");

  // Manual Add Part Modal States
  const [showAddModal, setShowAddModal] = useState(false);
  const [isSubmittingPart, setIsSubmittingPart] = useState(false);
  const [addPartError, setAddPartError] = useState<string | null>(null);
  const [newPart, setNewPart] = useState({
    item_name: "",
    brand_name: "Hero",
    supplier_id: "",
    supplier_discount: "0",
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
    supplier_id: "",
    supplier_discount: "0",
    part_number: "",
    model_number: "",
    compatible_bikes: "",
    rack_number: "",
    purchase_price: "",
    selling_price: "",
    quantity: "0",
    barcode: "",
  });

  // Consume Global Wireless Mobile Scanner Session
  const { registerBarcodeListener, setIsModalOpen, isPhoneConnected } = useScannerSession();
  const [barcodeScanTarget, setBarcodeScanTarget] = useState<
    "NEW_PART" | "EDIT_PART" | { partId: string; partName: string } | null
  >(null);
  const [scannerToast, setScannerToast] = useState<string | null>(null);

  // Quick Restock / Goods Inward Modal State
  const [restockTarget, setRestockTarget] = useState<SparePart | null>(null);
  const [inwardQty, setInwardQty] = useState("10");
  const [inwardCost, setInwardCost] = useState("");
  const [inwardRack, setInwardRack] = useState("");
  const [isRestocking, setIsRestocking] = useState(false);
  const [restockError, setRestockError] = useState<string | null>(null);

  // Load brands and suppliers master on mount
  useEffect(() => {
    async function loadMasterData() {
      try {
        const [brands, supps] = await Promise.all([
          brandsApi.getAll(),
          suppliersApi.getAll(),
        ]);
        if (brands && brands.length > 0) {
          setAvailableBrands(brands);
        }
        if (supps && supps.length > 0) {
          setAvailableSuppliers(supps);
          if (supps[0]) {
            setUploadSupplierId(String(supps[0].id));
            setUploadDiscountOverride(String(supps[0].defaultDiscountPercentage || 15));
          }
        }
      } catch (err) {
        console.warn("Could not fetch brands or suppliers master:", err);
      }
    }
    loadMasterData();
  }, []);

  // Listen for wireless mobile scanner scans when an input target is active
  useEffect(() => {
    const unregister = registerBarcodeListener(async (code) => {
      if (barcodeScanTarget === "NEW_PART") {
        setNewPart((prev) => ({ ...prev, barcode: code }));
        setScannerToast(`Barcode ${code} auto-filled!`);
        setTimeout(() => {
          setBarcodeScanTarget(null);
          setScannerToast(null);
        }, 1800);
      } else if (barcodeScanTarget === "EDIT_PART") {
        setEditForm((prev) => ({ ...prev, barcode: code }));
        setScannerToast(`Barcode ${code} auto-filled!`);
        setTimeout(() => {
          setBarcodeScanTarget(null);
          setScannerToast(null);
        }, 1800);
      } else if (typeof barcodeScanTarget === "object" && barcodeScanTarget?.partId) {
        try {
          await partsApi.assignBarcode(barcodeScanTarget.partId, code);
          setScannerToast(`Barcode ${code} assigned to ${barcodeScanTarget.partName}!`);
          if (onRefreshCatalog) onRefreshCatalog();
        } catch (err: any) {
          setScannerToast(`Barcode assignment failed: ${err.message}`);
        }
        setTimeout(() => {
          setBarcodeScanTarget(null);
          setScannerToast(null);
        }, 1800);
      }
    });

    return unregister;
  }, [barcodeScanTarget, registerBarcodeListener, onRefreshCatalog]);

  const handleTriggerPhoneScan = (
    target: "NEW_PART" | "EDIT_PART" | { partId: string; partName: string }
  ) => {
    setBarcodeScanTarget(target);
    if (!isPhoneConnected) {
      setIsModalOpen(true);
    } else {
      setScannerToast("📱 Phone ready! Scan the item barcode now...");
      setTimeout(() => setScannerToast(null), 3000);
    }
  };

  // Fetch soft-deleted parts for the Recycle Bin tab
  const loadDeletedParts = async () => {
    setIsLoadingDeleted(true);
    try {
      const deleted = await partsApi.getAll(undefined, undefined, undefined, undefined, true);
      setDeletedProducts(deleted);
    } catch (err) {
      console.warn("Could not load deleted parts from backend:", err);
    } finally {
      setIsLoadingDeleted(false);
    }
  };

  useEffect(() => {
    loadDeletedParts();
  }, []);

  // Total counts for confirmed, unconfirmed, and deleted sub-tabs
  const confirmedCount = products.filter((p) => p.isConfirmed !== false && !p.isDeleted).length;
  const unconfirmedCount = products.filter((p) => p.isConfirmed === false && !p.isDeleted).length;
  const deletedCount = deletedProducts.length;

  // Active source list depends on whether user is viewing the Recycle Bin
  const activeSourceList = activeInventoryTab === "deleted" ? deletedProducts : products;

  // Tokenized multi-attribute search filter with automotive synonym expansion & supplier filter
  const filteredProducts = activeSourceList.filter((item) => {
    // Sub-tab partition
    if (activeInventoryTab === "confirmed" && (item.isConfirmed === false || item.isDeleted)) return false;
    if (activeInventoryTab === "unconfirmed" && (item.isConfirmed !== false || item.isDeleted)) return false;
    if (activeInventoryTab === "deleted" && !item.isDeleted) return false;

    const searchTarget = `${item.name} ${item.brand} ${item.partNumber} ${item.modelNumber} ${item.compatibleBikes} ${item.rackNumber} ${item.barcode} ${item.supplierName || ""}`;
    const matchesSearch = matchSearchTokens(searchTarget, searchQuery);
    const matchesBrand =
      selectedBrand === "All" || item.brand.toLowerCase() === selectedBrand.toLowerCase();
    const matchesStatus =
      selectedStatus === "All" || item.status === selectedStatus;
    const matchesSupplier =
      selectedSupplier === "All" ||
      String(item.supplierId) === String(selectedSupplier) ||
      (item.supplierName && item.supplierName.toLowerCase() === selectedSupplier.toLowerCase());
    return matchesSearch && matchesBrand && matchesStatus && matchesSupplier;
  });

  // Multi-select handlers for unconfirmed and deleted items
  const toggleSelectPart = (id: string) => {
    if (activeInventoryTab === "deleted") {
      setSelectedDeletedIds((prev) => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        return next;
      });
    } else {
      setSelectedUnconfirmedIds((prev) => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        return next;
      });
    }
  };

  const isAllVisibleSelected =
    filteredProducts.length > 0 &&
    (activeInventoryTab === "deleted"
      ? filteredProducts.every((p) => selectedDeletedIds.has(p.id))
      : filteredProducts.every((p) => selectedUnconfirmedIds.has(p.id)));

  const toggleSelectAllVisible = () => {
    if (activeInventoryTab === "deleted") {
      if (isAllVisibleSelected) {
        setSelectedDeletedIds(new Set());
      } else {
        const next = new Set(selectedDeletedIds);
        filteredProducts.forEach((p) => next.add(p.id));
        setSelectedDeletedIds(next);
      }
    } else {
      if (isAllVisibleSelected) {
        setSelectedUnconfirmedIds(new Set());
      } else {
        const next = new Set(selectedUnconfirmedIds);
        filteredProducts.forEach((p) => next.add(p.id));
        setSelectedUnconfirmedIds(next);
      }
    }
  };

  // Bulk confirm handler
  const handleBulkConfirm = async () => {
    if (selectedUnconfirmedIds.size === 0) return;
    setIsConfirmingBulk(true);
    try {
      const ids = Array.from(selectedUnconfirmedIds).map((id) => parseInt(id, 10));
      const res = await partsApi.confirmParts(ids);
      setConfirmToast(`Successfully confirmed ${res.confirmed_count} part(s)! Moved to active catalog.`);
      setSelectedUnconfirmedIds(new Set());
      if (onRefreshCatalog) onRefreshCatalog();
      setTimeout(() => setConfirmToast(null), 4000);
    } catch (err: any) {
      setConfirmToast(`Failed to confirm parts: ${err.message}`);
      setTimeout(() => setConfirmToast(null), 4500);
    } finally {
      setIsConfirmingBulk(false);
    }
  };

  // Single confirm handler
  const handleSingleConfirm = async (part: SparePart, rackOverride?: string) => {
    setIsConfirmingSingle(true);
    try {
      await partsApi.confirmPart(
        part.id,
        rackOverride !== undefined
          ? rackOverride
          : part.rackNumber && part.rackNumber !== "Unassigned"
          ? part.rackNumber
          : undefined
      );
      setConfirmToast(`Part '${part.name}' confirmed and activated for counter sales!`);
      setQuickRackTarget(null);
      if (onRefreshCatalog) onRefreshCatalog();
      setTimeout(() => setConfirmToast(null), 3500);
    } catch (err: any) {
      setConfirmToast(`Failed to confirm part: ${err.message}`);
      setTimeout(() => setConfirmToast(null), 4000);
    } finally {
      setIsConfirmingSingle(false);
    }
  };

  // Soft Delete Handlers (Single & Batch)
  const handleSingleDelete = async (part: SparePart) => {
    if (!confirm(`Are you sure you want to move "${part.name}" to the Recycle Bin? You can restore it later.`)) {
      return;
    }
    try {
      await partsApi.delete(part.id);
      setConfirmToast(`Moved "${part.name}" to Recycle Bin.`);
      if (onRefreshCatalog) onRefreshCatalog();
      await loadDeletedParts();
      setTimeout(() => setConfirmToast(null), 3500);
    } catch (err: any) {
      setConfirmToast(`Failed to delete part: ${err.message}`);
      setTimeout(() => setConfirmToast(null), 4000);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedUnconfirmedIds.size === 0) return;
    if (!confirm(`Move ${selectedUnconfirmedIds.size} selected part(s) to the Recycle Bin?`)) {
      return;
    }
    setIsDeletingBulk(true);
    try {
      const ids = Array.from(selectedUnconfirmedIds);
      const res = await partsApi.deleteBatch(ids);
      setConfirmToast(`Moved ${res.deleted_count} part(s) to Recycle Bin.`);
      setSelectedUnconfirmedIds(new Set());
      if (onRefreshCatalog) onRefreshCatalog();
      await loadDeletedParts();
      setTimeout(() => setConfirmToast(null), 3500);
    } catch (err: any) {
      setConfirmToast(`Failed to delete parts: ${err.message}`);
      setTimeout(() => setConfirmToast(null), 4000);
    } finally {
      setIsDeletingBulk(false);
    }
  };

  // Restore Handlers (Single & Batch)
  const handleSingleRestore = async (part: SparePart) => {
    try {
      await partsApi.restore(part.id);
      setConfirmToast(`Restored "${part.name}" back into catalog!`);
      if (onRefreshCatalog) onRefreshCatalog();
      await loadDeletedParts();
      setTimeout(() => setConfirmToast(null), 3500);
    } catch (err: any) {
      setConfirmToast(`Failed to restore part: ${err.message}`);
      setTimeout(() => setConfirmToast(null), 4000);
    }
  };

  const handleBulkRestore = async () => {
    if (selectedDeletedIds.size === 0) return;
    setIsRestoringBulk(true);
    try {
      const ids = Array.from(selectedDeletedIds);
      const res = await partsApi.restoreBatch(ids);
      setConfirmToast(`Restored ${res.restored_count} part(s) back into catalog!`);
      setSelectedDeletedIds(new Set());
      if (onRefreshCatalog) onRefreshCatalog();
      await loadDeletedParts();
      setTimeout(() => setConfirmToast(null), 3500);
    } catch (err: any) {
      setConfirmToast(`Failed to restore parts: ${err.message}`);
      setTimeout(() => setConfirmToast(null), 4000);
    } finally {
      setIsRestoringBulk(false);
    }
  };

  // Handle Real Excel Upload with selected Supplier & Discount
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setImportError(null);
    setImportSummary(null);

    try {
      const discount = parseFloat(uploadDiscountOverride);
      const summary = await importsApi.uploadCatalogExcel(
        file,
        uploadSupplierId ? uploadSupplierId : undefined,
        uploadBrandOverride.trim() || undefined,
        !isNaN(discount) ? discount : undefined
      );
      setImportSummary(summary);
      setShowUploadModal(false);
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
        supplier_id: newPart.supplier_id ? parseInt(newPart.supplier_id, 10) : undefined,
        supplier_discount: parseFloat(newPart.supplier_discount) || 0,
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
        supplier_id: "",
        supplier_discount: "0",
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
      supplier_id: part.supplierId ? String(part.supplierId) : "",
      supplier_discount: String(part.supplierDiscount || "0"),
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
        supplier_id: editForm.supplier_id ? parseInt(editForm.supplier_id, 10) : undefined,
        supplier_discount: parseFloat(editForm.supplier_discount) || 0,
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
        default_customer_discount: parseFloat(newBrandCustomerDisc) || 0,
        default_mechanic_discount: parseFloat(newBrandMechanicDisc) || 0,
      });
      setAvailableBrands((prev) => [...prev, created]);
      setNewBrandName("");
      setNewBrandCode("");
      setNewBrandDesc("");
      setNewBrandCustomerDisc("5.00");
      setNewBrandMechanicDisc("10.00");
    } catch (err: any) {
      setBrandError(err.message || "Failed to save brand.");
    } finally {
      setIsAddingBrand(false);
    }
  };

  const handleStartEditBrand = (b: Brand) => {
    setEditingBrandId(b.id);
    setEditBrandCustomerDisc(String(b.defaultCustomerDiscount || 0));
    setEditBrandMechanicDisc(String(b.defaultMechanicDiscount || 0));
  };

  const handleSaveBrandDiscount = async (brandId: number) => {
    try {
      const updated = await brandsApi.update(brandId, {
        default_customer_discount: parseFloat(editBrandCustomerDisc) || 0,
        default_mechanic_discount: parseFloat(editBrandMechanicDisc) || 0,
      });
      setAvailableBrands((prev) => prev.map((b) => (b.id === brandId ? updated : b)));
      setEditingBrandId(null);
    } catch (err: any) {
      setBrandError(err.message || "Failed to update brand discounts.");
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
              onClick={() => setShowUploadModal(true)}
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

      {/* Sub-Tab Navigation: Confirmed vs Unconfirmed Staging vs Recycle Bin */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-1.5 rounded-2xl bg-white/[0.03] border border-white/10">
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-950/40">
          <button
            type="button"
            onClick={() => {
              setActiveInventoryTab("confirmed");
              setSelectedUnconfirmedIds(new Set());
              setSelectedDeletedIds(new Set());
            }}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
              activeInventoryTab === "confirmed"
                ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-lg shadow-emerald-500/10"
                : "text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]"
            }`}
          >
            <CheckCircle2 size={15} className={activeInventoryTab === "confirmed" ? "text-emerald-400" : "text-slate-400"} />
            <span>Confirmed Items</span>
            <span
              className={`px-2 py-0.5 rounded-full text-[11px] font-mono font-bold ${
                activeInventoryTab === "confirmed"
                  ? "bg-emerald-500/30 text-emerald-200"
                  : "bg-white/10 text-slate-400"
              }`}
            >
              {confirmedCount}
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveInventoryTab("unconfirmed");
              setSelectedUnconfirmedIds(new Set());
              setSelectedDeletedIds(new Set());
            }}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
              activeInventoryTab === "unconfirmed"
                ? "bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-lg shadow-amber-500/10"
                : "text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]"
            }`}
          >
            <AlertTriangle size={15} className={activeInventoryTab === "unconfirmed" ? "text-amber-400" : "text-slate-400"} />
            <span>Unconfirmed / Bulk Uploads</span>
            <span
              className={`px-2 py-0.5 rounded-full text-[11px] font-mono font-bold ${
                unconfirmedCount > 0
                  ? "bg-amber-500/30 text-amber-200 animate-pulse"
                  : "bg-white/10 text-slate-400"
              }`}
            >
              {unconfirmedCount}
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveInventoryTab("deleted");
              setSelectedUnconfirmedIds(new Set());
              setSelectedDeletedIds(new Set());
              loadDeletedParts();
            }}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
              activeInventoryTab === "deleted"
                ? "bg-rose-500/20 text-rose-300 border border-rose-500/40 shadow-lg shadow-rose-500/10"
                : "text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]"
            }`}
          >
            <Trash2 size={15} className={activeInventoryTab === "deleted" ? "text-rose-400" : "text-slate-400"} />
            <span>Recycle Bin / Deleted</span>
            <span
              className={`px-2 py-0.5 rounded-full text-[11px] font-mono font-bold ${
                deletedCount > 0
                  ? "bg-rose-500/30 text-rose-200"
                  : "bg-white/10 text-slate-400"
              }`}
            >
              {deletedCount}
            </span>
          </button>
        </div>

        <div className="text-xs text-slate-400 px-3 py-1 font-mono flex items-center gap-2">
          {activeInventoryTab === "confirmed" ? (
            <span className="text-emerald-400/90 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              Verified Active Catalog · Ready for POS Counter Sales
            </span>
          ) : activeInventoryTab === "unconfirmed" ? (
            <span className="text-amber-400/90 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
              Staging Queue · Locked from sales & search until confirmed
            </span>
          ) : (
            <span className="text-rose-400/90 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-rose-400" />
              Recycle Bin · Soft-deleted items preserved; click Restore to reactivate
            </span>
          )}
        </div>
      </div>

      {/* Unconfirmed Queue Informational Guide */}
      {activeInventoryTab === "unconfirmed" && (
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/25 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 text-xs text-amber-200/90">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-500/20 text-amber-300 shrink-0">
              <AlertTriangle size={18} />
            </div>
            <div>
              <p className="font-semibold text-white">
                Unconfirmed Staging Queue ({unconfirmedCount} items awaiting verification)
              </p>
              <p className="text-slate-300 text-[11px] mt-0.5">
                Parts imported from Excel spreadsheets land here automatically. Verify rack numbers and click <strong>Confirm</strong> to activate, or <strong>Delete</strong> unwanted rows.
              </p>
            </div>
          </div>
          {filteredProducts.length > 0 && (
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={toggleSelectAllVisible}
                className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-slate-200 text-xs font-semibold border border-white/15 transition-colors cursor-pointer"
              >
                {isAllVisibleSelected ? "Deselect All Visible" : `Select All Visible (${filteredProducts.length})`}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Recycle Bin Informational Guide */}
      {activeInventoryTab === "deleted" && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/25 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 text-xs text-rose-200/90">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-rose-500/20 text-rose-300 shrink-0">
              <Trash2 size={18} />
            </div>
            <div>
              <p className="font-semibold text-white">
                Recycle Bin ({deletedCount} soft-deleted items)
              </p>
              <p className="text-slate-300 text-[11px] mt-0.5">
                Items here are soft-deleted from active sales, searches, and stock valuations while preserving historical invoice and audit integrity. Click <strong>Restore</strong> to return items back to the catalog.
              </p>
            </div>
          </div>
          {filteredProducts.length > 0 && (
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={toggleSelectAllVisible}
                className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-slate-200 text-xs font-semibold border border-white/15 transition-colors cursor-pointer"
              >
                {isAllVisibleSelected ? "Deselect All Visible" : `Select All Visible (${filteredProducts.length})`}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Confirmation Floating / Action Notification Bar */}
      {confirmToast && (
        <div className="p-3 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-200 text-xs font-mono font-semibold flex items-center justify-between gap-2 shadow-xl animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
            <span>{confirmToast}</span>
          </div>
          <button
            onClick={() => setConfirmToast(null)}
            className="text-emerald-400 hover:text-white cursor-pointer px-1.5 py-0.5"
          >
            ✕
          </button>
        </div>
      )}

      {/* Multi-Select Floating Action Bar: Unconfirmed Queue */}
      {activeInventoryTab === "unconfirmed" && selectedUnconfirmedIds.size > 0 && (
        <div className="p-3.5 rounded-2xl bg-gradient-to-r from-amber-500/20 via-slate-900 to-emerald-500/20 border border-amber-500/40 shadow-2xl backdrop-blur-md flex flex-wrap items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-amber-500/30 text-amber-300">
              <CheckSquare size={16} />
            </div>
            <span className="text-xs font-semibold text-white">
              <strong className="font-mono text-amber-300 text-sm">{selectedUnconfirmedIds.size}</strong> item(s) selected
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setSelectedUnconfirmedIds(new Set())}
              className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-slate-300 text-xs font-semibold transition-colors cursor-pointer"
            >
              Clear Selection
            </button>
            <button
              type="button"
              onClick={handleBulkDelete}
              disabled={isDeletingBulk}
              className="px-3.5 py-1.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 font-bold text-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50 transition-all"
            >
              <Trash2 size={14} />
              <span>{isDeletingBulk ? "Deleting..." : `Delete Selected (${selectedUnconfirmedIds.size})`}</span>
            </button>
            <button
              type="button"
              onClick={handleBulkConfirm}
              disabled={isConfirmingBulk}
              className="px-4 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-lg shadow-emerald-500/20 flex items-center gap-1.5 cursor-pointer disabled:opacity-50 transition-all"
            >
              {isConfirmingBulk ? (
                <>
                  <Sparkles size={14} className="animate-spin" />
                  <span>Confirming...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 size={14} />
                  <span>Confirm Selected ({selectedUnconfirmedIds.size})</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Multi-Select Floating Action Bar: Recycle Bin */}
      {activeInventoryTab === "deleted" && selectedDeletedIds.size > 0 && (
        <div className="p-3.5 rounded-2xl bg-gradient-to-r from-rose-500/20 via-slate-900 to-emerald-500/20 border border-rose-500/40 shadow-2xl backdrop-blur-md flex flex-wrap items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-rose-500/30 text-rose-300">
              <CheckSquare size={16} />
            </div>
            <span className="text-xs font-semibold text-white">
              <strong className="font-mono text-rose-300 text-sm">{selectedDeletedIds.size}</strong> deleted item(s) selected
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setSelectedDeletedIds(new Set())}
              className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-slate-300 text-xs font-semibold transition-colors cursor-pointer"
            >
              Clear Selection
            </button>
            <button
              type="button"
              onClick={handleBulkRestore}
              disabled={isRestoringBulk}
              className="px-4 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-lg shadow-emerald-500/20 flex items-center gap-1.5 cursor-pointer disabled:opacity-50 transition-all"
            >
              <RotateCcw size={14} />
              <span>{isRestoringBulk ? "Restoring..." : `Restore Selected (${selectedDeletedIds.size})`}</span>
            </button>
          </div>
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
        <div className="flex flex-wrap items-center gap-2">
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

          {/* Supplier Dropdown */}
          <select
            value={selectedSupplier}
            onChange={(e) => setSelectedSupplier(e.target.value)}
            className="glass-input h-10 px-3 rounded-xl text-xs font-sans text-slate-200 outline-none max-w-[190px]"
          >
            <option value="All" className="bg-slate-900">All Suppliers</option>
            {availableSuppliers.map((s) => (
              <option key={s.id} value={s.id} className="bg-slate-900">
                {s.name} ({s.defaultDiscountPercentage}%)
              </option>
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
          <table className="w-full text-left text-xs font-sans min-w-[1050px]">
            <thead className="bg-white/[0.03] text-slate-400 font-mono uppercase border-b border-white/10 text-[11px]">
              <tr>
                {(activeInventoryTab === "unconfirmed" || activeInventoryTab === "deleted") && (
                  <th className="py-3.5 px-3 w-10 text-center">
                    <input
                      type="checkbox"
                      checked={isAllVisibleSelected}
                      onChange={toggleSelectAllVisible}
                      className={`w-4 h-4 rounded cursor-pointer ${
                        activeInventoryTab === "deleted" ? "accent-rose-500" : "accent-amber-500"
                      }`}
                      title="Select / Deselect all visible items"
                    />
                  </th>
                )}
                <th className="py-3.5 px-4">Part / Description</th>
                <th className="py-3.5 px-4">Brand</th>
                <th className="py-3.5 px-4">Part #</th>
                <th className="py-3.5 px-4">Supplier & Disc</th>
                <th className="py-3.5 px-4">Compatible Bikes</th>
                <th className="py-3.5 px-4">Rack Loc.</th>
                <th className="py-3.5 px-4">Stock Qty</th>
                <th className="py-3.5 px-4">Selling Price</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 font-mono">
              {filteredProducts.length === 0 ? (
                <tr>
                  <td
                    colSpan={activeInventoryTab === "unconfirmed" || activeInventoryTab === "deleted" ? 11 : 10}
                    className="py-12 text-center"
                  >
                    {activeInventoryTab === "deleted" && deletedProducts.length === 0 ? (
                      <div className="flex flex-col items-center justify-center gap-2">
                        <div className="w-12 h-12 rounded-full bg-slate-800/80 flex items-center justify-center text-slate-400 mb-1">
                          <Trash2 size={24} />
                        </div>
                        <p className="text-sm font-bold text-white">Recycle Bin is Empty</p>
                        <p className="text-xs text-slate-400 max-w-sm">
                          No deleted spare parts found. Items deleted from Confirmed or Unconfirmed inventory will appear here with option to restore.
                        </p>
                      </div>
                    ) : activeInventoryTab === "unconfirmed" && unconfirmedCount === 0 ? (
                      <div className="flex flex-col items-center justify-center gap-2">
                        <div className="w-12 h-12 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400 mb-1">
                          <CheckCircle2 size={26} />
                        </div>
                        <p className="text-sm font-bold text-white">All Items Confirmed!</p>
                        <p className="text-xs text-slate-400 max-w-sm">
                          There are no unconfirmed items pending review. All imported parts have been verified and moved to the active sales catalog.
                        </p>
                      </div>
                    ) : (
                      <div className="text-slate-400 py-6">
                        No spare parts found matching &quot;{searchQuery || selectedBrand}&quot; in this view.
                      </div>
                    )}
                  </td>
                </tr>
              ) : (
                filteredProducts.map((item) => (
                  <tr
                    key={item.id}
                    className={`hover:bg-white/[0.04] transition-colors ${
                      activeInventoryTab === "unconfirmed" && selectedUnconfirmedIds.has(item.id)
                        ? "bg-amber-500/[0.06]"
                        : activeInventoryTab === "deleted" && selectedDeletedIds.has(item.id)
                        ? "bg-rose-500/[0.06]"
                        : ""
                    }`}
                  >
                    {(activeInventoryTab === "unconfirmed" || activeInventoryTab === "deleted") && (
                      <td className="py-3.5 px-3 text-center">
                        <input
                          type="checkbox"
                          checked={
                            activeInventoryTab === "deleted"
                              ? selectedDeletedIds.has(item.id)
                              : selectedUnconfirmedIds.has(item.id)
                          }
                          onChange={() => toggleSelectPart(item.id)}
                          className={`w-4 h-4 rounded cursor-pointer ${
                            activeInventoryTab === "deleted" ? "accent-rose-500" : "accent-amber-500"
                          }`}
                        />
                      </td>
                    )}
                    <td className="py-3.5 px-4 font-sans">
                      <div className="font-semibold text-white flex items-center gap-2">
                        <span>{item.name}</span>
                        {item.isDeleted ? (
                          <span className="px-1.5 py-0.5 rounded text-[10px] bg-rose-500/20 text-rose-300 border border-rose-500/30 font-mono font-bold">
                            DELETED
                          </span>
                        ) : item.isConfirmed === false ? (
                          <span className="px-1.5 py-0.5 rounded text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/30 font-mono font-bold">
                            UNCONFIRMED
                          </span>
                        ) : null}
                      </div>
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
                      <div>{item.partNumber}</div>
                      {item.barcode ? (
                        <span className="text-[10px] text-slate-400 font-mono flex items-center gap-1 font-normal">
                          <Barcode size={10} />
                          {item.barcode}
                        </span>
                      ) : (
                        <button
                          onClick={() => handleTriggerPhoneScan({ partId: item.id, partName: item.name })}
                          className="text-[10px] text-amber-400 hover:text-amber-300 font-mono flex items-center gap-1 font-normal cursor-pointer transition-colors"
                          title="Scan and assign barcode"
                        >
                          <Smartphone size={10} />
                          <span>+ Assign Barcode</span>
                        </button>
                      )}
                    </td>
                    <td className="py-3.5 px-4 font-sans">
                      {item.supplierName ? (
                        <div>
                          <div className="font-semibold text-white truncate max-w-[150px]" title={item.supplierName}>
                            {item.supplierName}
                          </div>
                          <span className="text-[10px] text-emerald-400 font-mono font-bold">
                            {item.supplierDiscount || 0}% purchase disc
                          </span>
                        </div>
                      ) : (
                        <span className="text-slate-500 text-[11px]">Unassigned</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 font-sans text-slate-300 max-w-[180px] truncate" title={item.compatibleBikes}>
                      {item.compatibleBikes || "Universal"}
                    </td>
                    <td className="py-3.5 px-4">
                      {item.rackNumber && item.rackNumber !== "Unassigned" ? (
                        <span className="px-2 py-0.5 rounded-md bg-sky-500/15 text-sky-300 border border-sky-400/25 font-bold font-mono">
                          {item.rackNumber}
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            setQuickRackTarget(item);
                            setQuickRackValue("");
                          }}
                          className="px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/35 hover:bg-amber-500/30 text-[11px] font-bold font-mono flex items-center gap-1 cursor-pointer transition-colors"
                          title="Click to assign rack location"
                        >
                          <AlertTriangle size={11} />
                          <span>⚠️ Missing Rack</span>
                        </button>
                      )}
                    </td>
                    <td className="py-3.5 px-4 font-bold text-white text-sm">
                      {item.quantity}{" "}
                      <span className="text-xs text-slate-400 font-normal">units</span>
                    </td>
                    <td className="py-3.5 px-4 font-bold text-white text-sm">
                      {formatRupees(item.sellingPrice)}
                    </td>
                    <td className="py-3.5 px-4">
                      {item.isDeleted ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-400"></span>
                          Deleted
                        </span>
                      ) : item.isConfirmed === false ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                          Unconfirmed
                        </span>
                      ) : (
                        <GlassBadge status={item.status} />
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {activeInventoryTab === "deleted" ? (
                          <button
                            type="button"
                            onClick={() => handleSingleRestore(item)}
                            className="px-2.5 py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 text-xs font-semibold border border-emerald-500/40 flex items-center gap-1 cursor-pointer transition-colors"
                            title="Restore part to active catalog"
                          >
                            <RotateCcw size={13} />
                            <span>Restore</span>
                          </button>
                        ) : activeInventoryTab === "unconfirmed" ? (
                          <>
                            <button
                              type="button"
                              onClick={() => {
                                if (!item.rackNumber || item.rackNumber === "Unassigned") {
                                  setQuickRackTarget(item);
                                  setQuickRackValue("");
                                } else {
                                  handleSingleConfirm(item);
                                }
                              }}
                              className="px-2.5 py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 text-xs font-semibold border border-emerald-500/40 flex items-center gap-1 cursor-pointer transition-colors"
                              title="Confirm and move to active catalog"
                            >
                              <CheckCircle2 size={13} />
                              <span>Confirm</span>
                            </button>
                            <GlassButton
                              size="sm"
                              variant="secondary"
                              icon={<Edit2 size={13} />}
                              onClick={() => handleOpenEditModal(item)}
                            >
                              Edit
                            </GlassButton>
                            <button
                              type="button"
                              onClick={() => handleSingleDelete(item)}
                              className="p-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 hover:text-rose-300 border border-rose-500/25 transition-colors cursor-pointer"
                              title="Delete part (move to Recycle Bin)"
                            >
                              <Trash2 size={14} />
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={() => {
                                setRestockTarget(item);
                                setInwardQty("10");
                                setInwardCost(item.purchasePrice ? String(item.purchasePrice) : "");
                                setInwardRack(item.rackNumber || "");
                              }}
                              className="px-2.5 py-1.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 text-xs font-semibold border border-emerald-500/30 flex items-center gap-1 cursor-pointer transition-colors"
                              title="Quick Goods Inward / Restock"
                            >
                              <PlusCircle size={13} />
                              <span>Restock</span>
                            </button>
                            <GlassButton
                              size="sm"
                              variant="secondary"
                              icon={<Edit2 size={13} />}
                              onClick={() => handleOpenEditModal(item)}
                            >
                              Edit
                            </GlassButton>
                            <button
                              type="button"
                              onClick={() => handleSingleDelete(item)}
                              className="p-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 hover:text-rose-300 border border-rose-500/25 transition-colors cursor-pointer"
                              title="Delete part (move to Recycle Bin)"
                            >
                              <Trash2 size={14} />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
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

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                    Supplier / Wholesaler
                  </label>
                  <select
                    value={editForm.supplier_id}
                    onChange={(e) => {
                      const sId = e.target.value;
                      const supp = availableSuppliers.find((s) => String(s.id) === String(sId));
                      setEditForm({
                        ...editForm,
                        supplier_id: sId,
                        supplier_discount: supp ? String(supp.defaultDiscountPercentage) : editForm.supplier_discount,
                      });
                    }}
                    className="glass-input h-10 w-full px-3 rounded-xl text-xs font-sans text-slate-200 outline-none"
                  >
                    <option value="" className="bg-slate-900">None / Direct OEM</option>
                    {availableSuppliers.map((s) => (
                      <option key={s.id} value={s.id} className="bg-slate-900">{s.name}</option>
                    ))}
                  </select>
                </div>
                <GlassInput
                  label="Supplier Purchase Discount (%)"
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  value={editForm.supplier_discount}
                  onChange={(e) => setEditForm({ ...editForm, supplier_discount: e.target.value })}
                />
              </div>

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
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-semibold text-slate-300">
                      Barcode (EAN-13 / Code-128)
                    </label>
                    <button
                      type="button"
                      onClick={() => handleTriggerPhoneScan("EDIT_PART")}
                      className="text-[10px] font-mono text-sky-400 hover:text-sky-300 flex items-center gap-1 cursor-pointer transition-colors"
                      title="Scan barcode with phone"
                    >
                      <Smartphone size={11} />
                      <span>Scan with Phone</span>
                    </button>
                  </div>
                  <GlassInput
                    value={editForm.barcode}
                    onChange={(e) => setEditForm({ ...editForm, barcode: e.target.value })}
                  />
                </div>
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
              <div className="grid grid-cols-2 gap-2.5">
                <GlassInput
                  label="Default Retail Selling Disc (%)"
                  type="number"
                  placeholder="e.g. 5.00"
                  value={newBrandCustomerDisc}
                  onChange={(e) => setNewBrandCustomerDisc(e.target.value)}
                />
                <GlassInput
                  label="Default Mechanic Selling Disc (%)"
                  type="number"
                  placeholder="e.g. 10.00"
                  value={newBrandMechanicDisc}
                  onChange={(e) => setNewBrandMechanicDisc(e.target.value)}
                />
              </div>
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
              <div className="divide-y divide-white/5 max-h-64 overflow-y-auto pr-1 space-y-1">
                {availableBrands.map((b) => (
                  <div key={b.id} className="py-2.5 flex items-center justify-between text-xs gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white text-sm">{b.name}</span>
                        {b.code && (
                          <span className="px-1.5 py-0.5 rounded bg-sky-500/20 text-sky-300 font-mono text-[10px]">
                            {b.code}
                          </span>
                        )}
                      </div>
                      {b.description && (
                        <p className="text-[11px] text-slate-400 mt-0.5 truncate">{b.description}</p>
                      )}
                      
                      {editingBrandId === b.id ? (
                        <div className="mt-2 p-2 rounded-xl bg-black/40 border border-white/10 flex items-center gap-2">
                          <div className="flex-1">
                            <span className="text-[10px] text-slate-400 block mb-0.5">Retail Disc %:</span>
                            <input
                              type="number"
                              step="0.01"
                              value={editBrandCustomerDisc}
                              onChange={(e) => setEditBrandCustomerDisc(e.target.value)}
                              className="glass-input h-7 w-full px-2 text-xs font-mono text-emerald-400 font-bold rounded"
                            />
                          </div>
                          <div className="flex-1">
                            <span className="text-[10px] text-slate-400 block mb-0.5">Mechanic Disc %:</span>
                            <input
                              type="number"
                              step="0.01"
                              value={editBrandMechanicDisc}
                              onChange={(e) => setEditBrandMechanicDisc(e.target.value)}
                              className="glass-input h-7 w-full px-2 text-xs font-mono text-sky-400 font-bold rounded"
                            />
                          </div>
                          <div className="flex items-center gap-1 self-end mb-0.5">
                            <button
                              type="button"
                              onClick={() => handleSaveBrandDiscount(b.id)}
                              className="px-2 py-1 rounded bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 text-[10px] font-mono font-bold border border-emerald-500/30 cursor-pointer"
                            >
                              Save
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingBrandId(null)}
                              className="px-2 py-1 rounded bg-white/5 hover:bg-white/10 text-slate-400 text-[10px] cursor-pointer"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-300">
                            Retail: <strong>{b.defaultCustomerDiscount || 0}%</strong>
                          </span>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-sky-500/10 border border-sky-500/20 text-sky-300">
                            Mechanic: <strong>{b.defaultMechanicDiscount || 0}%</strong>
                          </span>
                        </div>
                      )}
                    </div>

                    {editingBrandId !== b.id && (
                      <button
                        type="button"
                        onClick={() => handleStartEditBrand(b)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors shrink-0 cursor-pointer"
                        title="Edit selling discounts"
                      >
                        <Edit2 size={13} />
                      </button>
                    )}
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

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                    Supplier / Wholesaler
                  </label>
                  <select
                    value={newPart.supplier_id}
                    onChange={(e) => {
                      const sId = e.target.value;
                      const supp = availableSuppliers.find((s) => String(s.id) === String(sId));
                      setNewPart({
                        ...newPart,
                        supplier_id: sId,
                        supplier_discount: supp ? String(supp.defaultDiscountPercentage) : newPart.supplier_discount,
                      });
                    }}
                    className="glass-input h-10 w-full px-3 rounded-xl text-xs font-sans text-slate-200 outline-none"
                  >
                    <option value="" className="bg-slate-900">None / Direct OEM</option>
                    {availableSuppliers.map((s) => (
                      <option key={s.id} value={s.id} className="bg-slate-900">{s.name}</option>
                    ))}
                  </select>
                </div>
                <GlassInput
                  label="Supplier Purchase Discount (%)"
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  placeholder="e.g. 15.00"
                  value={newPart.supplier_discount}
                  onChange={(e) => setNewPart({ ...newPart, supplier_discount: e.target.value })}
                />
              </div>

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
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-semibold text-slate-300">
                      Barcode
                    </label>
                    <button
                      type="button"
                      onClick={() => handleTriggerPhoneScan("NEW_PART")}
                      className="text-[10px] font-mono text-sky-400 hover:text-sky-300 flex items-center gap-1 cursor-pointer transition-colors"
                      title="Scan barcode with phone"
                    >
                      <Smartphone size={11} />
                      <span>Scan with Phone</span>
                    </button>
                  </div>
                  <GlassInput
                    placeholder="e.g. 8901234001021"
                    value={newPart.barcode}
                    onChange={(e) => setNewPart({ ...newPart, barcode: e.target.value })}
                  />
                </div>
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

      {/* Excel Upload with Supplier Selection Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md">
          <div className="glass-panel w-full max-w-lg rounded-3xl p-6 border border-white/15 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-sky-500/20 text-sky-400 flex items-center justify-center">
                  <Upload size={18} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">
                    Import Catalog / Distributor Bill (.xlsx)
                  </h3>
                  <p className="text-xs text-slate-400">
                    Upload spreadsheet under a specific supplier with wholesale discount mapping
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowUploadModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3.5">
              <div>
                <label className="block text-xs font-mono text-slate-300 mb-1">
                  Select Supplier / Wholesaler *
                </label>
                <select
                  value={uploadSupplierId}
                  onChange={(e) => {
                    const sId = e.target.value;
                    setUploadSupplierId(sId);
                    const supp = availableSuppliers.find((s) => String(s.id) === String(sId));
                    if (supp) {
                      setUploadDiscountOverride(String(supp.defaultDiscountPercentage || 15));
                    }
                  }}
                  className="glass-input h-10 w-full px-3.5 rounded-xl text-xs font-sans text-slate-200 outline-none"
                >
                  <option value="" className="bg-slate-900">None / Direct OEM</option>
                  {availableSuppliers.map((s) => (
                    <option key={s.id} value={s.id} className="bg-slate-900">
                      {s.name} ({s.defaultDiscountPercentage}% default disc)
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-mono text-slate-300 mb-1">
                    Brand Override (Optional)
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
                    Applied to wholesale purchase cost
                  </span>
                </div>
              </div>

              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-white/20 hover:border-sky-400/50 rounded-2xl p-6 text-center cursor-pointer transition-all bg-white/[0.02] hover:bg-sky-500/5 space-y-2 mt-2"
              >
                <Upload size={28} className="mx-auto text-sky-400 animate-bounce" />
                <div className="text-xs font-semibold text-white">
                  Click to select Excel workbook (.xlsx)
                </div>
                <p className="text-[11px] text-slate-400">
                  Items will be linked to the selected supplier with the purchase discount applied
                </p>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-white/10">
                <GlassButton
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => setShowUploadModal(false)}
                >
                  Cancel
                </GlassButton>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Active Barcode Assignment Banner if target is selected */}
      {barcodeScanTarget !== null && (
        <div className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-bottom-4 fade-in">
          <div className="glass-panel p-4 rounded-2xl bg-slate-900/95 border border-sky-400/40 shadow-2xl flex items-center gap-3 text-xs font-mono text-white max-w-sm">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
            <div className="flex-1">
              <div className="font-bold text-sky-300">
                {barcodeScanTarget === "NEW_PART"
                  ? "Awaiting Barcode for New Part"
                  : barcodeScanTarget === "EDIT_PART"
                  ? "Awaiting Barcode for Edit Part"
                  : `Assigning to: ${barcodeScanTarget.partName}`}
              </div>
              <div className="text-[11px] text-slate-400">
                {scannerToast || (isPhoneConnected ? "Point connected phone at barcode" : "Scan phone pairing required")}
              </div>
            </div>
            {!isPhoneConnected && (
              <button
                type="button"
                onClick={() => setIsModalOpen(true)}
                className="px-2.5 py-1.5 rounded-lg bg-sky-500/20 text-sky-300 hover:bg-sky-500/30 text-[11px] font-bold border border-sky-500/40 cursor-pointer shrink-0"
              >
                Pair Phone
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                setBarcodeScanTarget(null);
                setScannerToast(null);
              }}
              className="text-slate-400 hover:text-white p-1 rounded-lg cursor-pointer"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Quick Restock / Goods Inward Modal */}
      {restockTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in">
          <div className="glass-panel w-full max-w-lg p-6 rounded-3xl border border-emerald-500/30 bg-slate-900/95 shadow-2xl relative space-y-4">
            <button
              onClick={() => setRestockTarget(null)}
              className="absolute top-4 right-4 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
            >
              <X size={18} />
            </button>

            <div>
              <div className="flex items-center gap-2 mb-1">
                <Package className="text-emerald-400" size={20} />
                <h3 className="text-base font-bold text-white">Goods Inward · Add Incoming Stock</h3>
              </div>
              <p className="text-xs text-slate-400">
                Confirm incoming units received to update stock and log audit movements.
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 space-y-2">
              <div className="text-sm font-bold text-white leading-snug">{restockTarget.name}</div>
              <div className="grid grid-cols-2 gap-2 text-xs font-mono text-slate-300">
                <div>
                  <span className="text-slate-500 block text-[10px]">OEM PART NO:</span>
                  <span className="font-semibold text-sky-300">{restockTarget.partNumber}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">CURRENT STOCK:</span>
                  <span className="font-bold text-emerald-400">{restockTarget.quantity} Units on Shelf</span>
                </div>
              </div>
            </div>

            {restockError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle size={14} className="shrink-0" />
                <span>{restockError}</span>
              </div>
            )}

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const qty = parseInt(inwardQty, 10);
                if (isNaN(qty) || qty <= 0) {
                  setRestockError("Quantity must be greater than zero.");
                  return;
                }
                setIsRestocking(true);
                setRestockError(null);
                try {
                  const cost = inwardCost ? parseFloat(inwardCost) : undefined;
                  await partsApi.restock(restockTarget.id, {
                    quantity_to_add: qty,
                    purchase_price: !isNaN(cost as number) ? cost : undefined,
                    rack_number: inwardRack.trim() || undefined,
                  });
                  setRestockTarget(null);
                  if (onRefreshCatalog) onRefreshCatalog();
                } catch (err: any) {
                  setRestockError(err.message || "Failed to restock item.");
                } finally {
                  setIsRestocking(false);
                }
              }}
              className="space-y-3.5"
            >
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-[11px] font-mono text-slate-400 block mb-1">
                    Inward Quantity *
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={inwardQty}
                    onChange={(e) => setInwardQty(e.target.value)}
                    required
                    className="glass-input h-10 w-full px-3 rounded-xl text-sm font-mono text-emerald-300 font-bold"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-mono text-slate-400 block mb-1">
                    Purchase Cost (₹)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={inwardCost}
                    onChange={(e) => setInwardCost(e.target.value)}
                    placeholder="Cost price"
                    className="glass-input h-10 w-full px-3 rounded-xl text-sm font-mono text-white"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-mono text-slate-400 block mb-1">
                    Rack / Bin Locator
                  </label>
                  <input
                    type="text"
                    value={inwardRack}
                    onChange={(e) => setInwardRack(e.target.value)}
                    placeholder="e.g. B-04"
                    className="glass-input h-10 w-full px-3 rounded-xl text-sm font-mono text-white"
                  />
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-black/40 border border-white/5 flex items-center justify-between text-xs font-mono">
                <span className="text-slate-400">Resulting Stock Balance:</span>
                <span className="text-emerald-400 font-bold">
                  {restockTarget.quantity + (parseInt(inwardQty, 10) || 0)} Units
                </span>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <GlassButton
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => setRestockTarget(null)}
                >
                  Cancel
                </GlassButton>
                <GlassButton
                  type="submit"
                  variant="primary"
                  size="sm"
                  disabled={isRestocking}
                  icon={<CheckCircle2 size={14} />}
                >
                  {isRestocking ? "Adding Stock..." : "Confirm & Add Stock"}
                </GlassButton>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Quick Rack Location & Single Confirmation Modal */}
      {quickRackTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
          <GlassCard className="w-full max-w-md p-6 border-white/20 shadow-2xl relative">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-white/10">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <CheckCircle2 size={18} className="text-emerald-400" />
                  Validate & Confirm Spare Part
                </h3>
                <p className="text-xs text-slate-400 mt-0.5 truncate max-w-[280px]">
                  {quickRackTarget.name} (#{quickRackTarget.partNumber})
                </p>
              </div>
              <button
                onClick={() => setQuickRackTarget(null)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4">
              <p className="text-xs text-slate-300">
                Confirming this item activates it in the counter sales catalog. Assign or verify its warehouse shelf / rack location below:
              </p>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                  Rack / Shelf Location (e.g. RACK-A1, BIN-04)
                </label>
                <input
                  type="text"
                  value={quickRackValue}
                  onChange={(e) => setQuickRackValue(e.target.value)}
                  placeholder="e.g. RACK-A1 or BIN-12"
                  className="glass-input h-10 w-full px-3 rounded-xl text-xs font-mono text-slate-200 outline-none"
                  autoFocus
                />
                <span className="text-[11px] text-slate-400 mt-1 block">
                  Leave blank to retain current location or update later.
                </span>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/10">
                <GlassButton
                  size="sm"
                  variant="secondary"
                  onClick={() => setQuickRackTarget(null)}
                >
                  Cancel
                </GlassButton>
                <GlassButton
                  size="sm"
                  variant="primary"
                  disabled={isConfirmingSingle}
                  icon={<CheckCircle2 size={14} />}
                  onClick={() =>
                    handleSingleConfirm(
                      quickRackTarget,
                      quickRackValue.trim() || undefined
                    )
                  }
                >
                  {isConfirmingSingle ? "Confirming..." : "Confirm & Move to Catalog"}
                </GlassButton>
              </div>
            </div>
          </GlassCard>
        </div>
      )}
    </div>
  );
}
