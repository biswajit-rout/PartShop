"use client";

import React, { useState, useEffect, useRef } from "react";
import { SparePart, Mechanic } from "@/types";
import { formatRupees } from "@/utils/formatters";
import { matchSearchTokens, matchScannedCode } from "@/utils/search";
import { partsApi, billingApi, mechanicsApi, InvoiceResponse } from "@/api";
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

  // Load live mechanics on mount
  useEffect(() => {
    async function loadMechanics() {
      try {
        const mechs = await mechanicsApi.getAll(true);
        if (mechs && mechs.length > 0) {
          setLiveMechanics(mechs);
        }
      } catch (err) {
        console.warn("Could not load mechanics list:", err);
      }
    }
    loadMechanics();
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

  const handleAddItemByPart = (part: SparePart) => {
    const existingIndex = items.findIndex((i) => i.part.id === part.id);
    if (existingIndex > -1) {
      const updated = [...items];
      updated[existingIndex].quantity += 1;
      setItems(updated);
    } else {
      setItems([...items, { part, quantity: 1, discount: 0 }]);
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
            onClick={() => window.print()}
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
    </div>
  );
}
