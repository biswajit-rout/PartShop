"use client";

import React, { useState, useEffect, useRef } from "react";
import { SparePart, Mechanic, Brand } from "@/types";
import { formatRupees } from "@/utils/formatters";
import { matchSearchTokens, matchScannedCode } from "@/utils/search";
import { partsApi, billingApi, mechanicsApi, brandsApi, InvoiceResponse, InvoiceUpdateRequest } from "@/api";
import { useScannerSession } from "@/context/ScannerContext";
import PageHeading from "@/components/common/PageHeading";
import GlassButton from "@/components/ui/glass/GlassButton";
import GlassInput from "@/components/ui/glass/GlassInput";
import GlassCard from "@/components/ui/glass/GlassCard";
import {
  Barcode,
  Printer,
  FileText,
  User,
  CreditCard,
  Plus,
  Trash2,
  Wrench,
  CheckCircle,
  AlertCircle,
  Sparkles,
  Search,
  Bike,
  Smartphone,
  Receipt,
  ShoppingCart,
  Edit,
  Clock,
  Phone,
  Eye,
  X,
  RefreshCw,
  RotateCcw,
  Calendar,
  Filter,
  Ban,
  AlertTriangle,
} from "lucide-react";

interface BillingViewProps {
  products: SparePart[];
  onCheckoutSuccess?: () => void;
}

interface BillRow {
  part: SparePart;
  quantity: number;
  discount: number;
}

export default function BillingView({
  products,
  onCheckoutSuccess,
}: BillingViewProps) {
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [paymentType, setPaymentType] = useState("Cash");
  const [selectedMechanicId, setSelectedMechanicId] = useState("");
  const [barcodeInput, setBarcodeInput] = useState("");

  // Live mechanics list from database
  const [liveMechanics, setLiveMechanics] = useState<Mechanic[]>([]);

  // Search input state for bike model / part search
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  const [invoiceSuccess, setInvoiceSuccess] = useState(false);
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [generatedInvoice, setGeneratedInvoice] = useState<InvoiceResponse | null>(null);
  const [isSearchingBarcode, setIsSearchingBarcode] = useState(false);

  // Sub-Tab Navigation: POS Billing Counter vs Invoices History
  const [activeTab, setActiveTab] = useState<"pos" | "history">("pos");

  // Invoices History & Edit State
  const [invoices, setInvoices] = useState<InvoiceResponse[]>([]);
  const [isLoadingInvoices, setIsLoadingInvoices] = useState(false);
  const [invoiceSearchQuery, setInvoiceSearchQuery] = useState("");
  const [selectedInvoiceForModal, setSelectedInvoiceForModal] = useState<InvoiceResponse | null>(null);

  // Date Range and Status Filtering State for Invoices History
  const [dateRangePreset, setDateRangePreset] = useState<"all" | "today" | "week" | "month" | "custom">("all");
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "COMPLETED" | "VOIDED">("ALL");

  // Edit Invoice Modal State
  const [editingInvoice, setEditingInvoice] = useState<InvoiceResponse | null>(null);
  const [editCustomerName, setEditCustomerName] = useState("");
  const [editCustomerPhone, setEditCustomerPhone] = useState("");
  const [editPaymentMethod, setEditPaymentMethod] = useState<"CASH" | "CARD" | "UPI" | "CREDIT">("CASH");
  const [editItems, setEditItems] = useState<BillRow[]>([]);
  const [editPartSearch, setEditPartSearch] = useState("");
  const [editSearchFocused, setEditSearchFocused] = useState(false);
  const editSearchContainerRef = useRef<HTMLDivElement>(null);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [editSuccessMsg, setEditSuccessMsg] = useState<string | null>(null);

  // Cancel / Void Invoice Modal State
  const [cancellingInvoice, setCancellingInvoice] = useState<InvoiceResponse | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [isCancelling, setIsCancelling] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);
  const [cancelSuccessMsg, setCancelSuccessMsg] = useState<string | null>(null);

  const getFilterDates = (preset: string) => {
    const now = new Date();
    const formatYMD = (d: Date) => d.toISOString().split("T")[0];
    if (preset === "today") {
      const todayStr = formatYMD(now);
      return { start: todayStr, end: todayStr };
    } else if (preset === "week") {
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 6);
      return { start: formatYMD(weekAgo), end: formatYMD(now) };
    } else if (preset === "month") {
      const monthAgo = new Date();
      monthAgo.setDate(monthAgo.getDate() - 29);
      return { start: formatYMD(monthAgo), end: formatYMD(now) };
    } else if (preset === "custom") {
      return { start: customStartDate || undefined, end: customEndDate || undefined };
    }
    return { start: undefined, end: undefined };
  };

  const loadInvoices = async (
    search?: string,
    presetOverride?: "all" | "today" | "week" | "month" | "custom",
    statusOverride?: "ALL" | "COMPLETED" | "VOIDED",
    customStart?: string,
    customEnd?: string,
  ) => {
    setIsLoadingInvoices(true);
    try {
      const term = search !== undefined ? search : invoiceSearchQuery;
      const effectivePreset = presetOverride !== undefined ? presetOverride : dateRangePreset;
      const effectiveStatus = statusOverride !== undefined ? statusOverride : statusFilter;

      let start_date: string | undefined;
      let end_date: string | undefined;

      if (effectivePreset === "custom") {
        start_date = customStart !== undefined ? customStart : (customStartDate || undefined);
        end_date = customEnd !== undefined ? customEnd : (customEndDate || undefined);
      } else {
        const dates = getFilterDates(effectivePreset);
        start_date = dates.start;
        end_date = dates.end;
      }

      const data = await billingApi.getInvoices({
        search: term || undefined,
        start_date,
        end_date,
        status: effectiveStatus !== "ALL" ? effectiveStatus : undefined,
      });
      setInvoices(data);
    } catch (err) {
      console.error("Failed to load invoices:", err);
    } finally {
      setIsLoadingInvoices(false);
    }
  };

  useEffect(() => {
    if (activeTab === "history") {
      loadInvoices();
    }
  }, [activeTab]);

  const handleOpenEdit = (inv: InvoiceResponse) => {
    setEditingInvoice(inv);
    setEditCustomerName(inv.customer_name || "");
    setEditCustomerPhone(inv.customer_phone || "");
    setEditPaymentMethod((inv.payment_method as any) || "CASH");
    setEditError(null);
    setEditSuccessMsg(null);
    setEditPartSearch("");
    setEditSearchFocused(false);

    // Map invoice items to BillRow format
    const initialRows: BillRow[] = (inv.items || []).map((it) => {
      const matched = products.find((p) => String(p.id) === String(it.spare_part_id));
      const partObj: SparePart = matched || {
        id: String(it.spare_part_id),
        name: `Part #${it.spare_part_id}`,
        partNumber: `SKU-${it.spare_part_id}`,
        brand: "Generic",
        modelNumber: "Universal",
        compatibleBikes: "Universal",
        sellingPrice: Number(it.unit_price),
        purchasePrice: 0,
        customerDiscount: 0,
        mechanicDiscount: 0,
        quantity: 0,
        rackNumber: "BIN-1",
        status: "In Stock",
        barcode: "",
      };
      return {
        part: partObj,
        quantity: it.quantity,
        discount: Number(it.discount_percent || 0),
      };
    });
    setEditItems(initialRows);
  };

  const handleEditQuantityChange = (idx: number, newQty: number) => {
    const validQty = Math.max(1, newQty);
    setEditItems((prev) =>
      prev.map((row, i) => (i === idx ? { ...row, quantity: validQty } : row))
    );
  };

  const handleEditDiscountChange = (idx: number, newDisc: number) => {
    const validDisc = Math.min(100, Math.max(0, newDisc));
    setEditItems((prev) =>
      prev.map((row, i) => (i === idx ? { ...row, discount: validDisc } : row))
    );
  };

  const handleEditRemoveItem = (idx: number) => {
    setEditItems((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleEditAddPart = (part: SparePart) => {
    setEditItems((prev) => {
      const existingIdx = prev.findIndex((r) => String(r.part.id) === String(part.id));
      if (existingIdx >= 0) {
        return prev.map((r, i) =>
          i === existingIdx ? { ...r, quantity: r.quantity + 1 } : r
        );
      }
      let defaultDisc = 0;
      const brandMatch = liveBrands.find(
        (b) => b.name.toLowerCase() === (part.brand || "").toLowerCase()
      );
      if (brandMatch && brandMatch.defaultCustomerDiscount) {
        defaultDisc = Number(brandMatch.defaultCustomerDiscount);
      }
      return [
        ...prev,
        {
          part,
          quantity: 1,
          discount: defaultDisc,
        },
      ];
    });
    setEditPartSearch("");
    setEditSearchFocused(false);
  };

  const editSubtotal = editItems.reduce((acc, row) => {
    const lineGross = row.part.sellingPrice * row.quantity;
    const lineDiscount = lineGross * (row.discount / 100);
    return acc + (lineGross - lineDiscount);
  }, 0);
  const editTax = Math.round(editSubtotal * 0.18 * 100) / 100;
  const editGrandTotal = editSubtotal + editTax;

  const handleSaveEdit = async () => {
    if (!editingInvoice) return;
    if (editItems.length === 0) {
      setEditError("Invoice must contain at least 1 item. If customer returned all items, please use 'Return & Void' instead.");
      return;
    }
    setIsSavingEdit(true);
    setEditError(null);
    try {
      const payload: InvoiceUpdateRequest = {
        customer_name: editCustomerName.trim() || null,
        customer_phone: editCustomerPhone.trim() || null,
        payment_method: editPaymentMethod,
        items: editItems.map((r) => ({
          spare_part_id: Number(r.part.id),
          quantity: r.quantity,
          discount_percent: r.discount,
        })),
      };
      const updated = await billingApi.updateInvoice(editingInvoice.id, payload);
      setInvoices((prev) =>
        prev.map((inv) => (inv.id === updated.id ? updated : inv))
      );
      if (generatedInvoice?.id === updated.id) {
        setGeneratedInvoice(updated);
      }
      if (selectedInvoiceForModal?.id === updated.id) {
        setSelectedInvoiceForModal(updated);
      }
      setEditSuccessMsg("Invoice updated & stock quantities adjusted!");
      if (onCheckoutSuccess) {
        onCheckoutSuccess();
      }
      setTimeout(() => {
        setEditingInvoice(null);
        setEditSuccessMsg(null);
      }, 700);
    } catch (err: any) {
      setEditError(err.message || "Failed to update invoice.");
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleOpenCancelModal = (inv: InvoiceResponse) => {
    setCancellingInvoice(inv);
    setCancelReason("Customer returned items");
    setCancelError(null);
    setCancelSuccessMsg(null);
  };

  const handleConfirmCancelInvoice = async () => {
    if (!cancellingInvoice) return;
    setIsCancelling(true);
    setCancelError(null);
    try {
      const voided = await billingApi.cancelInvoice(cancellingInvoice.id, cancelReason);
      setInvoices((prev) =>
        prev.map((inv) => (inv.id === voided.id ? voided : inv))
      );
      if (generatedInvoice?.id === voided.id) {
        setGeneratedInvoice(voided);
      }
      if (selectedInvoiceForModal?.id === voided.id) {
        setSelectedInvoiceForModal(voided);
      }
      setCancelSuccessMsg(`Invoice #${voided.invoice_number} voided & items returned to inventory!`);
      if (onCheckoutSuccess) {
        onCheckoutSuccess();
      }
      setTimeout(() => {
        setCancellingInvoice(null);
        setCancelSuccessMsg(null);
      }, 900);
    } catch (err: any) {
      setCancelError(err.message || "Failed to cancel invoice.");
    } finally {
      setIsCancelling(false);
    }
  };

  // Consume Global Wireless Mobile Scanner Session
  const { registerBarcodeListener, setIsModalOpen, isPhoneConnected } = useScannerSession();

  // Listen for wireless mobile scanner scans
  useEffect(() => {
    const unregister = registerBarcodeListener(async (code) => {
      // 1. Check local catalog first
      const localMatch = products.find((p) => matchScannedCode(p, code));
      if (localMatch) {
        handleAddItemByPart(localMatch);
        return;
      }
      // 2. Query remote backend
      try {
        const remotePart = await partsApi.getByBarcode(code);
        if (remotePart) {
          handleAddItemByPart(remotePart);
        }
      } catch (err) {
        console.warn("Mobile scanned barcode not found in catalog:", code, err);
      }
    });

    return unregister;
  }, [registerBarcodeListener, products]);

  // Load live mechanics & brands on mount
  const [liveBrands, setLiveBrands] = useState<Brand[]>([]);

  useEffect(() => {
    async function loadData() {
      try {
        const [mechs, brands] = await Promise.all([
          mechanicsApi.getAll(true).catch(() => []),
          brandsApi.getAll().catch(() => []),
        ]);
        if (mechs && mechs.length > 0) {
          setLiveMechanics(mechs);
        }
        if (brands && brands.length > 0) {
          setLiveBrands(brands);
        }
      } catch (err) {
        console.warn("Could not load mechanics or brands list:", err);
      }
    }
    loadData();
  }, []);

  // Close search suggestions when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        searchContainerRef.current &&
        !searchContainerRef.current.contains(event.target as Node)
      ) {
        setIsSearchFocused(false);
      }
      if (
        editSearchContainerRef.current &&
        !editSearchContainerRef.current.contains(event.target as Node)
      ) {
        setEditSearchFocused(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Active shopping cart items
  const [items, setItems] = useState<BillRow[]>([]);

  const selectedMechanic = liveMechanics.find(
    (m) => String(m.id) === String(selectedMechanicId)
  );

  // Helper to get mechanic commission percentage for a specific item brand
  const getLineCommissionRate = (partBrand: string): number => {
    if (!selectedMechanic) return 0;
    if (selectedMechanic.brandCommissions && selectedMechanic.brandCommissions.length > 0) {
      const match = selectedMechanic.brandCommissions.find(
        (bc) =>
          (bc.brandName || "").toLowerCase().trim() === partBrand.toLowerCase().trim()
      );
      if (match) return match.commissionPercentage;
    }
    return selectedMechanic.defaultCommissionPercentage || selectedMechanic.commissionPercentage || 5;
  };

  // Helper to get auto-resolved default line selling discount (Brand level or Mechanic level)
  const getDefaultLineDiscount = (part: SparePart): number => {
    // 1. If mechanic is selected, apply mechanic rate
    if (selectedMechanic) {
      if (part.mechanicDiscount && Number(part.mechanicDiscount) > 0) {
        return Number(part.mechanicDiscount);
      }
      const mechBrandComm = getLineCommissionRate(part.brand);
      if (mechBrandComm > 0) return mechBrandComm;
    }

    // 2. Otherwise apply item-specific customer discount if configured
    if (part.customerDiscount && Number(part.customerDiscount) > 0) {
      return Number(part.customerDiscount);
    }

    // 3. Fallback to Brand default customer discount (e.g. Hero 5%, Swiss 10%)
    const matchedBrand = liveBrands.find(
      (b) => b.name.trim().toLowerCase() === (part.brand || "").trim().toLowerCase()
    );
    if (matchedBrand && matchedBrand.defaultCustomerDiscount) {
      return Number(matchedBrand.defaultCustomerDiscount);
    }

    return 0;
  };

  // Recalculate line discounts when customer type changes (e.g. Mechanic selected or unselected)
  useEffect(() => {
    if (items.length === 0) return;
    setItems((prevItems) =>
      prevItems.map((item) => ({
        ...item,
        discount: getDefaultLineDiscount(item.part),
      }))
    );
  }, [selectedMechanicId]);

  const handleAddItemByPart = (part: SparePart) => {
    const existingIndex = items.findIndex((i) => i.part.id === part.id);
    if (existingIndex > -1) {
      const updated = [...items];
      updated[existingIndex].quantity += 1;
      setItems(updated);
    } else {
      const initialDisc = getDefaultLineDiscount(part);
      setItems([...items, { part, quantity: 1, discount: initialDisc }]);
    }
    setBarcodeInput("");
    setIsSearchFocused(false);
  };

  // Autocomplete matching: matches bike model, part name, SKU, or barcode using tokenized search
  const searchMatches = barcodeInput.trim()
    ? products
        .filter((p) => {
          const target = `${p.compatibleBikes} ${p.modelNumber} ${p.name} ${p.partNumber} ${p.brand} ${p.barcode}`;
          return matchSearchTokens(target, barcodeInput);
        })
        .slice(0, 8)
    : [];

  const handleBarcodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const query = barcodeInput.trim();
    if (!query) return;

    // Check in local catalog first (matching barcode, partNumber, smart QR match, or token match)
    const found = products.find(
      (p) =>
        matchScannedCode(p, query) ||
        matchSearchTokens(`${p.compatibleBikes} ${p.modelNumber} ${p.name} ${p.partNumber} ${p.brand} ${p.barcode}`, query)
    );

    if (found) {
      handleAddItemByPart(found);
      return;
    }

    // Query live PostgreSQL backend by barcode (< 5ms)
    setIsSearchingBarcode(true);
    try {
      const remotePart = await partsApi.getByBarcode(query);
      if (remotePart) {
        handleAddItemByPart(remotePart);
      } else {
        alert(`No spare part matched: "${query}" in catalog.`);
      }
    } catch (err: any) {
      alert(`Barcode lookup failed: ${err.message}`);
    } finally {
      setIsSearchingBarcode(false);
    }
  };

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const handleQuantityChange = (index: number, qty: number) => {
    if (qty < 1) return;
    const updated = [...items];
    updated[index].quantity = qty;
    setItems(updated);
  };

  const handleDiscountChange = (index: number, disc: number) => {
    const updated = [...items];
    updated[index].discount = disc;
    setItems(updated);
  };

  // Pricing & Tax Calculations
  const subtotal = items.reduce((sum, item) => {
    const itemTotal = item.part.sellingPrice * item.quantity;
    const discountAmount = (itemTotal * item.discount) / 100;
    return sum + (itemTotal - discountAmount);
  }, 0);

  const gstTax = Math.round(subtotal * 0.18); // 18% standard GST for auto spares
  const grandTotal = subtotal + gstTax;

  // Calculate total mechanic commission based on item-brand commission matrix
  const totalMechanicCommission = items.reduce((sum, item) => {
    if (!selectedMechanic) return 0;
    const itemTotal = item.part.sellingPrice * item.quantity;
    const itemDiscount = (itemTotal * item.discount) / 100;
    const lineTotal = itemTotal - itemDiscount;
    const rate = getLineCommissionRate(item.part.brand);
    return sum + Math.round((lineTotal * rate) / 100);
  }, 0);

  // Real Atomic POS Checkout Execution
  const handleGenerateInvoice = async () => {
    if (items.length === 0) {
      setCheckoutError("Cart is empty. Please add spare parts before checking out.");
      return;
    }

    setIsCheckingOut(true);
    setCheckoutError(null);

    // Map payment type to backend enum
    let method: "CASH" | "CARD" | "UPI" | "CREDIT" = "CASH";
    const pt = paymentType.toUpperCase();
    if (pt.includes("UPI")) method = "UPI";
    else if (pt.includes("CARD")) method = "CARD";
    else if (pt.includes("CREDIT")) method = "CREDIT";

    try {
      const invoice = await billingApi.checkout({
        customer_name: customerName.trim() || undefined,
        customer_phone: customerPhone.trim() || undefined,
        payment_method: method,
        mechanic_id: selectedMechanicId ? Number(selectedMechanicId) : undefined,
        items: items.map((i) => ({
          spare_part_id: Number(i.part.id),
          quantity: i.quantity,
          discount_percent: i.discount,
        })),
      });

      setGeneratedInvoice(invoice);
      setInvoiceSuccess(true);
      setInvoices((prev) => [invoice, ...prev]);
      setItems([]); // Clear cart upon successful transaction

      if (onCheckoutSuccess) {
        onCheckoutSuccess();
      }
    } catch (err: any) {
      setCheckoutError(err.message || "Checkout failed. Please check stock levels.");
    } finally {
      setIsCheckingOut(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeading
        title="POS Billing Counter"
        subtitle="Fast counter billing, stock deduction, and mechanic brand commission tracking"
        badge="GST COMPLIANT (18%)"
        action={
          <div className="flex items-center gap-2">
            <GlassButton
              variant="secondary"
              size="sm"
              icon={<Printer size={15} />}
              onClick={() => window.print()}
            >
              Print Thermal (F9)
            </GlassButton>
            <GlassButton
              variant="secondary"
              size="sm"
              icon={<FileText size={15} />}
              onClick={() => alert("Downloading A4 Tax Invoice PDF...")}
            >
              A4 Invoice
            </GlassButton>
          </div>
        }
      />

      {/* Sub-Tab Navigation Switcher */}
      <div className="flex items-center gap-3 border-b border-white/10 pb-4">
        <button
          type="button"
          onClick={() => setActiveTab("pos")}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === "pos"
              ? "bg-sky-500 text-white shadow-lg shadow-sky-500/25 ring-2 ring-sky-400/30"
              : "bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10"
          }`}
        >
          <ShoppingCart size={15} />
          <span>New Bill / POS Counter</span>
        </button>
        <button
          type="button"
          onClick={() => {
            setActiveTab("history");
            loadInvoices();
          }}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === "history"
              ? "bg-sky-500 text-white shadow-lg shadow-sky-500/25 ring-2 ring-sky-400/30"
              : "bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10"
          }`}
        >
          <Receipt size={15} />
          <span>Invoices History</span>
          {invoices.length > 0 && (
            <span className="px-2 py-0.5 rounded-full text-[10px] bg-sky-950/80 text-sky-300 border border-sky-400/30 font-mono">
              {invoices.length}
            </span>
          )}
        </button>
      </div>

      {activeTab === "pos" && (
        <>
          {invoiceSuccess && generatedInvoice && (
            <div className="glass-card rounded-2xl p-4 bg-emerald-500/15 border border-emerald-400/30 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />
                <div className="text-xs">
                  <span className="font-bold text-white">Invoice #{generatedInvoice.invoice_number} Settled!</span>{" "}
                  <span className="text-emerald-200">
                    Stock deducted. Grand Total: {formatRupees(Number(generatedInvoice.grand_total))} via {generatedInvoice.payment_method}.
                    {selectedMechanic && (
                      <span className="ml-1 text-amber-300 font-semibold">
                        (Mechanic {selectedMechanic.name} credited ₹{totalMechanicCommission})
                      </span>
                    )}
                  </span>
                </div>
              </div>
              <GlassButton
                variant="secondary"
                size="sm"
                icon={<Printer size={14} />}
                onClick={() => setSelectedInvoiceForModal(generatedInvoice)}
              >
                Print Receipt
              </GlassButton>
            </div>
          )}

          {checkoutError && (
            <div className="glass-card rounded-2xl p-4 bg-rose-500/15 border border-rose-500/30 flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
              <div className="text-xs text-rose-200">
                <span className="font-bold text-white">Checkout Error:</span> {checkoutError}
              </div>
            </div>
          )}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.75fr)_minmax(350px,1fr)]">
        {/* Left Column: Bill Details and Line Items */}
        <div className="space-y-6">
          {/* Customer & Mechanic Header Panel */}
          <div className="glass-panel rounded-3xl p-5 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <GlassInput
                label="Customer Name / Mobile"
                placeholder="Walk-in Customer"
                icon={<User size={15} />}
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
              />

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                  Payment Mode
                </label>
                <div className="relative">
                  <CreditCard
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                    size={15}
                  />
                  <select
                    value={paymentType}
                    onChange={(e) => setPaymentType(e.target.value)}
                    className="glass-input h-10 w-full pl-10 pr-3 rounded-xl text-xs sm:text-sm font-sans text-slate-200 outline-none"
                  >
                    <option value="Cash" className="bg-slate-900">Cash Payment</option>
                    <option value="UPI" className="bg-slate-900">UPI / QR Code</option>
                    <option value="Card" className="bg-slate-900">Debit / Credit Card</option>
                    <option value="Credit" className="bg-slate-900">Garage Credit (Khata)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                  Mechanic Partner (Commission)
                </label>
                <div className="relative">
                  <Wrench
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                    size={15}
                  />
                  <select
                    value={selectedMechanicId}
                    onChange={(e) => setSelectedMechanicId(e.target.value)}
                    className="glass-input h-10 w-full pl-10 pr-3 rounded-xl text-xs sm:text-sm font-sans text-slate-200 outline-none"
                  >
                    <option value="" className="bg-slate-900">No Mechanic Assigned</option>
                    {liveMechanics.map((m) => (
                      <option key={m.id} value={m.id} className="bg-slate-900">
                        {m.garageName || m.name} ({m.defaultCommissionPercentage || m.commissionPercentage}%)
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Quick Search Bar: Model Name, Part Name, SKU, or Barcode */}
            <div ref={searchContainerRef} className="pt-2 relative">
              <form onSubmit={handleBarcodeSubmit} className="flex gap-2">
                <div className="relative flex-1">
                  <Search
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sky-400"
                    size={18}
                  />
                  <input
                    type="text"
                    value={barcodeInput}
                    onChange={(e) => {
                      setBarcodeInput(e.target.value);
                      setIsSearchFocused(true);
                    }}
                    onFocus={() => setIsSearchFocused(true)}
                    placeholder="Search by bike model (e.g. Pulsar 150, Splendor), part name, SKU, or scan barcode..."
                    className="glass-input h-11 w-full pl-11 pr-4 rounded-xl text-xs sm:text-sm font-sans placeholder:font-sans"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(true)}
                  className={`h-11 px-3 rounded-xl border flex items-center gap-1.5 text-xs font-mono transition-all cursor-pointer shrink-0 ${
                    isPhoneConnected
                      ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/25"
                      : "bg-white/5 border-white/10 text-slate-300 hover:bg-white/10 hover:text-white"
                  }`}
                  title={isPhoneConnected ? "Wireless phone scanner connected" : "Connect mobile phone scanner"}
                >
                  <Smartphone size={16} className={isPhoneConnected ? "text-emerald-400" : "text-sky-400"} />
                  <span className="hidden sm:inline">
                    {isPhoneConnected ? "Scanner Ready" : "Scan Phone"}
                  </span>
                </button>
                <GlassButton
                  type="submit"
                  variant="primary"
                  size="md"
                  icon={isSearchingBarcode ? <Sparkles size={16} className="animate-spin" /> : <Plus size={16} />}
                >
                  Add Part
                </GlassButton>
              </form>

              {/* Autocomplete Dropdown Picker */}
              {isSearchFocused && searchMatches.length > 0 && (
                <div className="absolute left-0 right-0 top-full mt-1.5 z-40 rounded-2xl bg-slate-950/95 border border-white/20 backdrop-blur-2xl shadow-2xl overflow-hidden divide-y divide-white/5 max-h-72 overflow-y-auto">
                  {searchMatches.map((match) => (
                    <div
                      key={match.id}
                      onClick={() => handleAddItemByPart(match)}
                      className="p-3 hover:bg-sky-500/10 cursor-pointer flex items-center justify-between transition-colors"
                    >
                      <div>
                        <div className="text-xs font-bold text-white flex items-center gap-2">
                          <span>{match.name}</span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-sky-500/20 text-sky-300 font-mono">
                            {match.brand} · {match.partNumber}
                          </span>
                        </div>
                        {match.compatibleBikes && (
                          <div className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5 font-sans">
                            <Bike size={12} className="text-slate-500" />
                            <span>Fits: {match.compatibleBikes}</span>
                          </div>
                        )}
                      </div>
                      <div className="text-right">
                        <span className="text-sm font-bold text-white font-mono">
                          {formatRupees(match.sellingPrice)}
                        </span>
                        <div className="text-[10px] text-emerald-400 font-mono">
                          {match.quantity} in stock
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Line Items Table */}
          <div className="glass-panel rounded-3xl p-5">
            <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-3">
              <h3 className="text-sm font-bold text-white tracking-wide">
                Invoice Line Items ({items.length})
              </h3>
              <span className="text-xs text-slate-400 font-mono">
                Standard Auto GST @ 18%
              </span>
            </div>

            {items.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-xs">
                No items added yet. Search by bike model, part name, or scan barcode to add parts to bill.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-sans min-w-[650px]">
                  <thead className="text-slate-400 font-mono uppercase border-b border-white/5 text-[11px]">
                    <tr>
                      <th className="py-2.5 px-3">Item / Part</th>
                      <th className="py-2.5 px-3">Compatible Bikes</th>
                      <th className="py-2.5 px-3">Rack</th>
                      <th className="py-2.5 px-3">Qty</th>
                      <th className="py-2.5 px-3">Unit Rate</th>
                      <th className="py-2.5 px-3">Disc %</th>
                      <th className="py-2.5 px-3">Amount</th>
                      {selectedMechanic && (
                        <th className="py-2.5 px-3">Mech Comm</th>
                      )}
                      <th className="py-2.5 px-3 text-right"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 font-mono">
                    {items.map((row, idx) => {
                      const itemSub = row.part.sellingPrice * row.quantity;
                      const discAmount = (itemSub * row.discount) / 100;
                      const rowTotal = itemSub - discAmount;
                      const lineCommRate = getLineCommissionRate(row.part.brand);
                      const lineCommAmount = Math.round((rowTotal * lineCommRate) / 100);

                      return (
                        <tr
                          key={row.part.id}
                          className="hover:bg-white/[0.03] transition-colors"
                        >
                          <td className="py-3 px-3">
                            <div className="font-sans font-semibold text-white">
                              {row.part.name}
                            </div>
                            <div className="text-[11px] text-slate-400 font-mono">
                              {row.part.partNumber} · {row.part.brand}
                            </div>
                          </td>
                          <td className="py-3 px-3 font-sans text-slate-300 max-w-[150px] truncate text-[11px]">
                            {row.part.compatibleBikes || "Universal"}
                          </td>
                          <td className="py-3 px-3">
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/10 text-sky-300">
                              {row.part.rackNumber}
                            </span>
                          </td>
                          <td className="py-3 px-3">
                            <div className="flex items-center gap-1.5">
                              <input
                                type="number"
                                min={1}
                                value={row.quantity}
                                onChange={(e) =>
                                  handleQuantityChange(
                                    idx,
                                    parseInt(e.target.value, 10) || 1
                                  )
                                }
                                className="w-14 h-7 text-center rounded-lg bg-black/40 border border-white/15 text-white font-mono text-xs focus:border-sky-400 outline-none"
                              />
                            </div>
                          </td>
                          <td className="py-3 px-3 text-slate-300">
                            {formatRupees(row.part.sellingPrice)}
                          </td>
                          <td className="py-3 px-3">
                            <div className="flex items-center gap-1">
                              <input
                                type="number"
                                min={0}
                                max={100}
                                value={row.discount}
                                onChange={(e) =>
                                  handleDiscountChange(
                                    idx,
                                    parseFloat(e.target.value) || 0
                                  )
                                }
                                className="w-12 h-7 text-center rounded-lg bg-black/40 border border-white/15 text-white font-mono text-xs focus:border-sky-400 outline-none"
                              />
                              <span className="text-[10px] text-slate-400">%</span>
                            </div>
                          </td>
                          <td className="py-3 px-3 font-bold text-white">
                            {formatRupees(rowTotal)}
                          </td>
                          {selectedMechanic && (
                            <td className="py-3 px-3">
                              <span className="px-1.5 py-0.5 rounded bg-purple-500/15 text-purple-300 text-[10px] font-bold">
                                {lineCommRate}% (₹{lineCommAmount})
                              </span>
                            </td>
                          )}
                          <td className="py-3 px-3 text-right">
                            <button
                              onClick={() => handleRemoveItem(idx)}
                              className="p-1 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                            >
                              <Trash2 size={14} />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Thermal Receipt Preview & Bill Summary */}
        <div className="space-y-6">
          <div className="glass-panel rounded-3xl p-6 space-y-4">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
              Settlement Summary
            </h3>

            <div className="space-y-2.5 text-xs font-mono pt-1">
              <div className="flex justify-between text-slate-300">
                <span>Subtotal ({items.length} items)</span>
                <span>{formatRupees(subtotal)}</span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span>GST Tax (18% Integrated)</span>
                <span>{formatRupees(gstTax)}</span>
              </div>
              {selectedMechanic && (
                <div className="flex justify-between text-purple-300 bg-purple-500/10 p-2 rounded-xl border border-purple-500/20">
                  <span>Mechanic Comm. ({selectedMechanic.name})</span>
                  <span className="font-bold">{formatRupees(totalMechanicCommission)}</span>
                </div>
              )}
              <div className="border-t border-white/10 pt-3 flex justify-between items-baseline">
                <span className="text-sm font-bold text-white font-sans">
                  Total Payable
                </span>
                <span className="text-xl font-bold text-sky-400">
                  {formatRupees(grandTotal)}
                </span>
              </div>
            </div>

            <div className="pt-2">
              <GlassButton
                variant="primary"
                size="lg"
                className="w-full justify-center shadow-lg shadow-sky-500/20"
                onClick={handleGenerateInvoice}
                disabled={isCheckingOut || items.length === 0}
              >
                {isCheckingOut ? "Processing Sale..." : "Complete Sale (F12)"}
              </GlassButton>
            </div>
          </div>
        </div>
      </div>
      </>
      )}

      {/* =========================================================================
          Tab 2: Invoices History & Edit Table
         ========================================================================= */}
      {activeTab === "history" && (
        <div className="space-y-4 animate-in fade-in">
          {/* Search, Date Presets & Status Filter Toolbar */}
          <div className="p-4 rounded-2xl glass-panel border border-white/10 space-y-3">
            <div className="flex flex-col md:flex-row items-center justify-between gap-3">
              {/* Search Bar */}
              <div className="relative w-full md:w-80">
                <Search
                  size={15}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  type="text"
                  placeholder="Search invoice #, customer, phone..."
                  value={invoiceSearchQuery}
                  onChange={(e) => {
                    setInvoiceSearchQuery(e.target.value);
                    loadInvoices(e.target.value);
                  }}
                  className="glass-input w-full h-9 pl-9 pr-4 rounded-xl text-xs text-white placeholder-slate-400"
                />
              </div>

              {/* Status Filter Tabs */}
              <div className="flex items-center gap-1.5 p-1 rounded-xl bg-black/40 border border-white/10 text-xs self-start md:self-auto">
                {(
                  [
                    { id: "ALL", label: "All Invoices" },
                    { id: "COMPLETED", label: "🟢 Active" },
                    { id: "VOIDED", label: "🔴 Voided / Returned" },
                  ] as const
                ).map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => {
                      setStatusFilter(tab.id);
                      loadInvoices(undefined, undefined, tab.id);
                    }}
                    className={`px-3 py-1.5 rounded-lg font-medium transition-all cursor-pointer ${
                      statusFilter === tab.id
                        ? "bg-sky-500/25 text-sky-200 border border-sky-400/40 shadow-sm"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Refresh Button */}
              <div className="flex items-center gap-2 w-full md:w-auto justify-end">
                <GlassButton
                  variant="secondary"
                  size="sm"
                  icon={<RefreshCw size={13} className={isLoadingInvoices ? "animate-spin" : ""} />}
                  onClick={() => loadInvoices()}
                >
                  Refresh
                </GlassButton>
              </div>
            </div>

            {/* Date Range Presets Bar */}
            <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-white/5 text-xs">
              <span className="text-slate-400 font-mono text-[11px] flex items-center gap-1 mr-1">
                <Calendar size={13} className="text-sky-400" /> Date Filter:
              </span>
              {(
                [
                  { id: "all", label: "All Time" },
                  { id: "today", label: "Today" },
                  { id: "week", label: "This Week" },
                  { id: "month", label: "This Month" },
                  { id: "custom", label: "Custom Range" },
                ] as const
              ).map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => {
                    setDateRangePreset(preset.id);
                    loadInvoices(undefined, preset.id);
                  }}
                  className={`px-3 py-1 rounded-lg text-xs font-mono transition-all cursor-pointer ${
                    dateRangePreset === preset.id
                      ? "bg-sky-500 text-white font-bold shadow-md shadow-sky-500/20"
                      : "bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10"
                  }`}
                >
                  {preset.label}
                </button>
              ))}

              {/* Custom Date Pickers */}
              {dateRangePreset === "custom" && (
                <div className="flex items-center gap-2 ml-auto mt-2 sm:mt-0 animate-in fade-in">
                  <input
                    type="date"
                    value={customStartDate}
                    onChange={(e) => {
                      setCustomStartDate(e.target.value);
                      loadInvoices(undefined, "custom", undefined, e.target.value, customEndDate);
                    }}
                    className="glass-input h-8 px-2.5 rounded-lg text-xs font-mono text-slate-200"
                  />
                  <span className="text-slate-500 text-xs">to</span>
                  <input
                    type="date"
                    value={customEndDate}
                    onChange={(e) => {
                      setCustomEndDate(e.target.value);
                      loadInvoices(undefined, "custom", undefined, customStartDate, e.target.value);
                    }}
                    className="glass-input h-8 px-2.5 rounded-lg text-xs font-mono text-slate-200"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Invoices List Glass Card */}
          <GlassCard className="rounded-2xl p-0 overflow-hidden border border-white/10">
            {isLoadingInvoices ? (
              <div className="p-12 text-center text-slate-400 text-xs flex flex-col items-center gap-2">
                <RefreshCw size={20} className="animate-spin text-sky-400" />
                <span>Loading past invoices...</span>
              </div>
            ) : invoices.length === 0 ? (
              <div className="p-12 text-center text-slate-400 text-xs">
                No invoices found matching current filters.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-white/5 border-b border-white/10 text-slate-400 font-mono">
                    <tr>
                      <th className="py-3 px-4">Invoice #</th>
                      <th className="py-3 px-4">Date & Time</th>
                      <th className="py-3 px-4">Customer Details</th>
                      <th className="py-3 px-4 text-center">Status</th>
                      <th className="py-3 px-4">Payment</th>
                      <th className="py-3 px-4 text-center">Items</th>
                      <th className="py-3 px-4 text-right">Grand Total</th>
                      <th className="py-3 px-4 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 font-mono">
                    {invoices.map((inv) => {
                      const isVoided = inv.status === "VOIDED";
                      return (
                        <tr
                          key={inv.id}
                          className={`transition-colors ${
                            isVoided ? "bg-rose-500/[0.04] opacity-80" : "hover:bg-white/[0.03]"
                          }`}
                        >
                          <td className="py-3 px-4">
                            <span
                              className={`font-bold ${
                                isVoided ? "line-through text-rose-300" : "text-sky-300"
                              }`}
                            >
                              {inv.invoice_number}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-slate-300">
                            {new Date(inv.created_at).toLocaleString("en-IN", {
                              dateStyle: "medium",
                              timeStyle: "short",
                            })}
                          </td>
                          <td className="py-3 px-4">
                            <div className="font-sans font-medium text-white">
                              {inv.customer_name || <span className="text-slate-400 italic">Walk-in Customer</span>}
                            </div>
                            {inv.customer_phone && (
                              <div className="text-[11px] text-slate-400 font-mono flex items-center gap-1">
                                <Phone size={10} /> {inv.customer_phone}
                              </div>
                            )}
                          </td>
                          <td className="py-3 px-4 text-center">
                            {isVoided ? (
                              <div className="inline-flex flex-col items-center">
                                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                                  Voided / Returned
                                </span>
                                {inv.cancellation_reason && (
                                  <span className="text-[9px] text-rose-400/80 truncate max-w-[130px]" title={inv.cancellation_reason}>
                                    {inv.cancellation_reason}
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                                Completed
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            <span
                              className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                                inv.payment_method === "CASH"
                                  ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                                  : inv.payment_method === "UPI"
                                  ? "bg-sky-500/20 text-sky-300 border border-sky-500/30"
                                  : inv.payment_method === "CARD"
                                  ? "bg-indigo-500/20 text-indigo-300 border border-indigo-500/30"
                                  : "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                              }`}
                            >
                              {inv.payment_method}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-center text-slate-300">
                            {inv.items?.length || 0}
                          </td>
                          <td className="py-3 px-4 text-right font-bold text-white text-sm">
                            <span className={isVoided ? "line-through text-slate-400" : ""}>
                              {formatRupees(Number(inv.grand_total))}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center justify-center gap-1.5">
                              {/* 1. View & Print Receipt */}
                              <button
                                type="button"
                                onClick={() => setSelectedInvoiceForModal(inv)}
                                className="p-1.5 rounded-lg bg-sky-500/15 hover:bg-sky-500/25 text-sky-300 border border-sky-500/30 transition-colors cursor-pointer"
                                title="View & Print Receipt"
                              >
                                <Eye size={14} />
                              </button>

                              {/* 2. Edit Customer Details (Only if not voided) */}
                              <button
                                type="button"
                                onClick={() => handleOpenEdit(inv)}
                                disabled={isVoided}
                                className={`p-1.5 rounded-lg border transition-colors ${
                                  isVoided
                                    ? "bg-white/5 text-slate-600 border-white/5 cursor-not-allowed"
                                    : "bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 cursor-pointer"
                                }`}
                                title={isVoided ? "Cannot edit voided bill" : "Edit Customer / Payment Method"}
                              >
                                <Edit size={14} />
                              </button>

                              {/* 3. Return Items & Cancel Bill (Only if not voided) */}
                              <button
                                type="button"
                                onClick={() => handleOpenCancelModal(inv)}
                                disabled={isVoided}
                                className={`p-1.5 rounded-lg border transition-colors ${
                                  isVoided
                                    ? "bg-white/5 text-slate-600 border-white/5 cursor-not-allowed"
                                    : "bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30 cursor-pointer"
                                }`}
                                title={isVoided ? "Already voided & returned" : "Return Items & Cancel Bill"}
                              >
                                <RotateCcw size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </GlassCard>
        </div>
      )}

      {/* =========================================================================
          Modal 1: View & Print Invoice Receipt Modal
         ========================================================================= */}
      {selectedInvoiceForModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in">
          <div className="glass-panel w-full max-w-xl p-6 rounded-3xl border border-sky-500/30 bg-slate-900/95 shadow-2xl relative space-y-4 max-h-[92vh] overflow-y-auto no-scrollbar">
            <button
              onClick={() => setSelectedInvoiceForModal(null)}
              className="absolute top-4 right-4 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            >
              <X size={18} />
            </button>

            <div className="border-b border-white/10 pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <Receipt className="text-sky-400" size={18} />
                    Tax Invoice #{selectedInvoiceForModal.invoice_number}
                  </h3>
                  <p className="text-xs text-slate-400 font-mono mt-0.5">
                    Date: {new Date(selectedInvoiceForModal.created_at).toLocaleString("en-IN")}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {selectedInvoiceForModal.status === "VOIDED" ? (
                    <span className="px-2.5 py-1 rounded-lg text-xs font-mono font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40">
                      VOIDED
                    </span>
                  ) : (
                    <span className="px-2.5 py-1 rounded-lg text-xs font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                      COMPLETED
                    </span>
                  )}
                  <span className="px-2.5 py-1 rounded-lg text-xs font-mono font-bold bg-sky-500/20 text-sky-300 border border-sky-500/30">
                    {selectedInvoiceForModal.payment_method}
                  </span>
                </div>
              </div>
            </div>

            {selectedInvoiceForModal.status === "VOIDED" && (
              <div className="p-3 rounded-2xl bg-rose-500/20 border border-rose-500/40 text-rose-200 text-xs flex items-center gap-2.5">
                <Ban size={18} className="text-rose-400 shrink-0" />
                <div>
                  <span className="font-bold text-white uppercase block">
                    Voided / Cancelled Invoice (Stock Returned)
                  </span>
                  <span>
                    Reason: {selectedInvoiceForModal.cancellation_reason || "Customer return"}
                    {selectedInvoiceForModal.cancelled_at && (
                      <span className="text-slate-400 font-mono ml-1">
                        ({new Date(selectedInvoiceForModal.cancelled_at).toLocaleString("en-IN")})
                      </span>
                    )}
                  </span>
                </div>
              </div>
            )}

            {/* Customer Details */}
            <div className="p-3 rounded-xl bg-white/5 border border-white/10 text-xs grid grid-cols-2 gap-2">
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-mono">Customer</span>
                <span className="font-semibold text-white">
                  {selectedInvoiceForModal.customer_name || "Walk-in Customer"}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-mono">Phone</span>
                <span className="font-mono text-slate-300">
                  {selectedInvoiceForModal.customer_phone || "N/A"}
                </span>
              </div>
            </div>

            {/* Line items */}
            <div className="rounded-xl border border-white/10 overflow-hidden">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-white/5 border-b border-white/10 text-slate-400">
                  <tr>
                    <th className="p-2.5">Item</th>
                    <th className="p-2.5 text-center">Qty</th>
                    <th className="p-2.5 text-right">Price</th>
                    <th className="p-2.5 text-right">Disc</th>
                    <th className="p-2.5 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {selectedInvoiceForModal.items?.map((item, idx) => {
                    const matched = products.find((p) => String(p.id) === String(item.spare_part_id));
                    return (
                      <tr key={item.id || idx}>
                        <td className="p-2.5">
                          <div className="font-sans font-medium text-white">
                            {matched?.name || `Part #${item.spare_part_id}`}
                          </div>
                          {matched?.partNumber && (
                            <div className="text-[10px] text-slate-400">{matched.partNumber}</div>
                          )}
                        </td>
                        <td className="p-2.5 text-center text-slate-300">{item.quantity}</td>
                        <td className="p-2.5 text-right text-slate-300">
                          {formatRupees(Number(item.unit_price))}
                        </td>
                        <td className="p-2.5 text-right text-slate-400">
                          {Number(item.discount_percent) > 0 ? `${item.discount_percent}%` : "-"}
                        </td>
                        <td className="p-2.5 text-right font-bold text-white">
                          {formatRupees(Number(item.total_price))}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Summary */}
            <div className="p-3 rounded-xl bg-white/5 border border-white/10 space-y-1.5 text-xs font-mono">
              <div className="flex justify-between text-slate-300">
                <span>Subtotal</span>
                <span>{formatRupees(Number(selectedInvoiceForModal.subtotal))}</span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span>Discount</span>
                <span>- {formatRupees(Number(selectedInvoiceForModal.discount_amount))}</span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span>GST (18% Integrated)</span>
                <span>{formatRupees(Number(selectedInvoiceForModal.tax_amount))}</span>
              </div>
              <div className="border-t border-white/10 pt-2 flex justify-between font-bold text-sm text-white">
                <span>Grand Total</span>
                <span className="text-sky-400">
                  {formatRupees(Number(selectedInvoiceForModal.grand_total))}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <GlassButton
                variant="secondary"
                size="sm"
                onClick={() => setSelectedInvoiceForModal(null)}
              >
                Close
              </GlassButton>
              <GlassButton
                variant="primary"
                size="sm"
                icon={<Printer size={14} />}
                onClick={() => window.print()}
              >
                Print Receipt
              </GlassButton>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          Modal 2: Modify Invoice Details & Items Modal
         ========================================================================= */}
      {editingInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in">
          <div className="glass-panel w-full max-w-3xl p-6 rounded-3xl border border-amber-500/30 bg-slate-900/95 shadow-2xl relative space-y-4 max-h-[92vh] overflow-y-auto no-scrollbar">
            <button
              onClick={() => setEditingInvoice(null)}
              className="absolute top-4 right-4 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            >
              <X size={18} />
            </button>

            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Edit className="text-amber-400" size={18} />
                Edit Invoice #{editingInvoice.invoice_number}
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Update customer details, change quantities, add new parts, or remove returned items. Inventory stock updates automatically.
              </p>
            </div>

            {editError && (
              <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle size={15} className="shrink-0 text-rose-400" />
                <span>{editError}</span>
              </div>
            )}
            {editSuccessMsg && (
              <div className="p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
                <CheckCircle size={15} className="shrink-0 text-emerald-400" />
                <span>{editSuccessMsg}</span>
              </div>
            )}

            {/* Customer & Payment Method Section */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs bg-white/[0.02] p-3.5 rounded-2xl border border-white/5">
              <div>
                <label className="text-slate-300 font-medium block mb-1">Customer Name</label>
                <input
                  type="text"
                  value={editCustomerName}
                  onChange={(e) => setEditCustomerName(e.target.value)}
                  placeholder="e.g. Ramesh Kumar"
                  className="glass-input w-full h-9 px-3 rounded-xl text-white text-xs"
                />
              </div>

              <div>
                <label className="text-slate-300 font-medium block mb-1">Customer Phone</label>
                <input
                  type="text"
                  value={editCustomerPhone}
                  onChange={(e) => setEditCustomerPhone(e.target.value)}
                  placeholder="e.g. 9876543210"
                  className="glass-input w-full h-9 px-3 rounded-xl text-white text-xs font-mono"
                />
              </div>

              <div>
                <label className="text-slate-300 font-medium block mb-1">Payment Method</label>
                <div className="grid grid-cols-4 gap-1">
                  {(["CASH", "UPI", "CARD", "CREDIT"] as const).map((method) => (
                    <button
                      key={method}
                      type="button"
                      onClick={() => setEditPaymentMethod(method)}
                      className={`py-2 px-1 rounded-lg border text-[11px] font-bold transition-all cursor-pointer text-center ${
                        editPaymentMethod === method
                          ? "bg-amber-500/20 text-amber-300 border-amber-400 shadow-[0_0_12px_rgba(245,158,11,0.2)]"
                          : "bg-white/5 hover:bg-white/10 text-slate-300 border-white/10"
                      }`}
                    >
                      {method}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Items Management Section */}
            <div className="space-y-3 pt-1 border-t border-white/10">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <label className="text-xs font-mono font-bold text-white flex items-center gap-1.5">
                  <ShoppingCart size={14} className="text-amber-400" />
                  Invoice Items ({editItems.length})
                </label>

                {/* Search to add parts */}
                <div ref={editSearchContainerRef} className="relative w-full sm:w-80">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={editPartSearch}
                    onChange={(e) => {
                      setEditPartSearch(e.target.value);
                      setEditSearchFocused(true);
                    }}
                    onFocus={() => setEditSearchFocused(true)}
                    placeholder="Search part or SKU to add to bill..."
                    className="glass-input w-full h-8 pl-8 pr-3 rounded-xl text-xs text-white"
                  />
                  {/* Suggestions dropdown */}
                  {editSearchFocused && editPartSearch.trim().length > 0 && (
                    <div className="absolute left-0 right-0 top-full mt-1.5 z-50 max-h-52 overflow-y-auto rounded-xl bg-slate-900/95 border border-sky-500/30 shadow-2xl p-1 space-y-1 no-scrollbar backdrop-blur-md">
                      {products
                        .filter((p) =>
                          matchSearchTokens(
                            `${p.compatibleBikes} ${p.modelNumber} ${p.name} ${p.partNumber} ${p.brand} ${p.barcode}`,
                            editPartSearch
                          )
                        )
                        .slice(0, 8)
                        .map((p) => (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => handleEditAddPart(p)}
                            className="w-full text-left p-2 rounded-lg hover:bg-white/10 transition-colors flex items-center justify-between text-xs cursor-pointer"
                          >
                            <div>
                              <span className="font-semibold text-white block truncate max-w-[180px]">{p.name}</span>
                              <span className="text-[10px] text-slate-400 font-mono">{p.partNumber} · {p.brand}</span>
                            </div>
                            <div className="text-right shrink-0">
                              <span className="font-bold text-sky-300 block">{formatRupees(p.sellingPrice)}</span>
                              <span className="text-[10px] text-emerald-400 font-mono">Stock: {p.quantity}</span>
                            </div>
                          </button>
                        ))}
                      {products.filter((p) =>
                        matchSearchTokens(
                          `${p.compatibleBikes} ${p.modelNumber} ${p.name} ${p.partNumber} ${p.brand} ${p.barcode}`,
                          editPartSearch
                        )
                      ).length === 0 && (
                        <div className="p-2 text-center text-xs text-slate-400 italic">No parts match &quot;{editPartSearch}&quot;</div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Items Table */}
              <div className="border border-white/10 rounded-2xl overflow-hidden bg-black/20">
                <table className="w-full text-left text-xs">
                  <thead className="bg-white/5 font-mono text-[11px] text-slate-400 border-b border-white/10">
                    <tr>
                      <th className="py-2.5 px-3">Part Description</th>
                      <th className="py-2.5 px-3 text-center">Qty</th>
                      <th className="py-2.5 px-3 text-right">Price</th>
                      <th className="py-2.5 px-3 text-center">Disc %</th>
                      <th className="py-2.5 px-3 text-right">Total</th>
                      <th className="py-2.5 px-3 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 font-mono">
                    {editItems.map((row, idx) => {
                      const lineGross = row.part.sellingPrice * row.quantity;
                      const lineDiscount = lineGross * (row.discount / 100);
                      const lineTotal = lineGross - lineDiscount;
                      return (
                        <tr key={`${row.part.id}-${idx}`} className="hover:bg-white/[0.02]">
                          <td className="py-2.5 px-3 font-sans">
                            <span className="font-semibold text-white block">{row.part.name}</span>
                            <span className="text-[10px] text-slate-400 font-mono">{row.part.partNumber} · {row.part.brand}</span>
                          </td>
                          <td className="py-2.5 px-3">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                type="button"
                                onClick={() => handleEditQuantityChange(idx, row.quantity - 1)}
                                className="w-6 h-6 rounded-md bg-white/10 hover:bg-white/20 text-slate-300 flex items-center justify-center font-bold text-xs cursor-pointer"
                              >
                                -
                              </button>
                              <input
                                type="number"
                                min={1}
                                value={row.quantity}
                                onChange={(e) => handleEditQuantityChange(idx, parseInt(e.target.value, 10) || 1)}
                                className="w-11 h-6 text-center rounded-md bg-black/50 border border-white/15 text-white font-mono text-xs focus:border-amber-400 outline-none"
                              />
                              <button
                                type="button"
                                onClick={() => handleEditQuantityChange(idx, row.quantity + 1)}
                                className="w-6 h-6 rounded-md bg-white/10 hover:bg-white/20 text-slate-300 flex items-center justify-center font-bold text-xs cursor-pointer"
                              >
                                +
                              </button>
                            </div>
                          </td>
                          <td className="py-2.5 px-3 text-right text-slate-300">
                            {formatRupees(row.part.sellingPrice)}
                          </td>
                          <td className="py-2.5 px-3">
                            <div className="flex items-center justify-center gap-0.5">
                              <input
                                type="number"
                                min={0}
                                max={100}
                                value={row.discount}
                                onChange={(e) => handleEditDiscountChange(idx, parseFloat(e.target.value) || 0)}
                                className="w-10 h-6 text-center rounded-md bg-black/50 border border-white/15 text-white font-mono text-xs focus:border-amber-400 outline-none"
                              />
                              <span className="text-[10px] text-slate-400">%</span>
                            </div>
                          </td>
                          <td className="py-2.5 px-3 text-right font-bold text-white">
                            {formatRupees(lineTotal)}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <button
                              type="button"
                              onClick={() => handleEditRemoveItem(idx)}
                              title="Remove item from invoice"
                              className="p-1 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                            >
                              <Trash2 size={13} />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                    {editItems.length === 0 && (
                      <tr>
                        <td colSpan={6} className="py-6 text-center text-slate-400 italic">
                          No items remaining. Please add at least 1 item or cancel the invoice.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Settlement Summary in Edit Modal */}
              <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs font-mono">
                <div className="flex items-center gap-2 text-amber-300/80 text-[11px]">
                  <AlertCircle size={14} className="shrink-0 text-amber-400" />
                  <span>Stock levels adjust automatically (increase = stock deduction, decrease = stock returned).</span>
                </div>
                <div className="flex items-center gap-4 text-right">
                  <div>
                    <span className="text-slate-400 text-[10px] block">Subtotal</span>
                    <span className="text-slate-200">{formatRupees(editSubtotal)}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px] block">18% GST</span>
                    <span className="text-slate-200">{formatRupees(editTax)}</span>
                  </div>
                  <div className="border-l border-white/10 pl-3">
                    <span className="text-slate-400 text-[10px] block">Grand Total</span>
                    <span className="text-amber-300 font-bold text-sm">{formatRupees(editGrandTotal)}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/10">
              <GlassButton
                variant="secondary"
                size="sm"
                onClick={() => setEditingInvoice(null)}
                disabled={isSavingEdit}
              >
                Cancel
              </GlassButton>
              <GlassButton
                variant="primary"
                size="sm"
                onClick={handleSaveEdit}
                disabled={isSavingEdit || editItems.length === 0}
              >
                {isSavingEdit ? "Saving Changes..." : "Save Changes"}
              </GlassButton>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          Modal 3: Void / Cancel Invoice Modal
         ========================================================================= */}
      {cancellingInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in">
          <div className="glass-panel w-full max-w-lg p-6 rounded-3xl border border-rose-500/40 bg-slate-900/95 shadow-2xl relative space-y-4 max-h-[92vh] overflow-y-auto no-scrollbar">
            <button
              onClick={() => setCancellingInvoice(null)}
              className="absolute top-4 right-4 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            >
              <X size={18} />
            </button>

            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <RotateCcw className="text-rose-400" size={18} />
                Return & Void Invoice #{cancellingInvoice.invoice_number}
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Process customer goods return and reverse counter billing transaction.
              </p>
            </div>

            <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-200 text-xs flex items-start gap-2.5">
              <AlertTriangle size={18} className="text-rose-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <span className="font-bold text-white block">Automatic Inventory Restock Notice:</span>
                <p className="text-[11px] leading-relaxed text-rose-300">
                  Confirming this return will automatically increment stock quantities for all{" "}
                  <strong>{cancellingInvoice.items?.length || 0}</strong> line items back into available inventory and record immutable <code>RETURN_IN</code> audit logs.
                </p>
              </div>
            </div>

            {cancelError && (
              <div className="p-3 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-300 text-xs">
                {cancelError}
              </div>
            )}
            {cancelSuccessMsg && (
              <div className="p-3 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs">
                {cancelSuccessMsg}
              </div>
            )}

            {/* Items summary */}
            <div className="rounded-xl border border-white/10 overflow-hidden text-xs">
              <div className="bg-white/5 p-2 font-mono text-[11px] text-slate-400 font-bold">
                Parts Being Returned to Stock:
              </div>
              <div className="divide-y divide-white/5 max-h-36 overflow-y-auto font-mono">
                {cancellingInvoice.items?.map((item) => {
                  const matched = products.find((p) => String(p.id) === String(item.spare_part_id));
                  return (
                    <div key={item.id} className="p-2.5 flex items-center justify-between text-slate-300">
                      <div>
                        <span className="font-sans font-medium text-white block">
                          {matched?.name || `Part #${item.spare_part_id}`}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {matched?.partNumber}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold">
                          +{item.quantity} Qty
                        </span>
                        <span className="block text-[10px] text-slate-400">
                          {formatRupees(Number(item.total_price))}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Return Reason input */}
            <div className="space-y-1 text-xs">
              <label className="text-slate-300 font-medium block">
                Cancellation / Return Reason:
              </label>
              <input
                type="text"
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="e.g. Customer returned parts / wrong item entered"
                className="glass-input w-full h-9 px-3 rounded-xl text-white text-xs"
              />
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-white/10">
              <span className="text-xs text-slate-400 font-mono">
                Total Refund: <strong className="text-white">{formatRupees(Number(cancellingInvoice.grand_total))}</strong>
              </span>
              <div className="flex items-center gap-2">
                <GlassButton
                  variant="secondary"
                  size="sm"
                  onClick={() => setCancellingInvoice(null)}
                  disabled={isCancelling}
                >
                  Close
                </GlassButton>
                <GlassButton
                  variant="danger"
                  size="sm"
                  icon={<RotateCcw size={14} className={isCancelling ? "animate-spin" : ""} />}
                  onClick={handleConfirmCancelInvoice}
                  disabled={isCancelling}
                >
                  {isCancelling ? "Returning..." : "Confirm Return & Void Bill"}
                </GlassButton>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
