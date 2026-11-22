import React, { useState } from "react";
import { SparePart, Mechanic } from "@/types";
import { initialMechanics } from "@/data/mock-data";
import { formatRupees } from "@/utils/formatters";
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
} from "lucide-react";

interface BillingViewProps {
  products: SparePart[];
}

interface BillRow {
  part: SparePart;
  quantity: number;
  discount: number;
}

export default function BillingView({ products }: BillingViewProps) {
  const [customerName, setCustomerName] = useState("");
  const [paymentType, setPaymentType] = useState("Cash");
  const [selectedMechanicId, setSelectedMechanicId] = useState("");
  const [barcodeInput, setBarcodeInput] = useState("");
  const [invoiceSuccess, setInvoiceSuccess] = useState(false);

  // Default active invoice items
  const [items, setItems] = useState<BillRow[]>([
    { part: products[0], quantity: 2, discount: 0 },
    { part: products[3], quantity: 1, discount: 5 },
  ]);

  const selectedMechanic = initialMechanics.find(
    (m) => m.id === selectedMechanicId
  );

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
  };

  const handleBarcodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!barcodeInput.trim()) return;
    const found = products.find(
      (p) =>
        p.barcode === barcodeInput.trim() ||
        p.partNumber.toLowerCase() === barcodeInput.trim().toLowerCase()
    );
    if (found) {
      handleAddItemByPart(found);
    } else {
      alert(`No spare part matched barcode: "${barcodeInput}"`);
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

  // Calculations
  const subtotal = items.reduce((sum, item) => {
    const itemTotal = item.part.sellingPrice * item.quantity;
    const discountAmount = (itemTotal * item.discount) / 100;
    return sum + (itemTotal - discountAmount);
  }, 0);

  const gstTax = Math.round(subtotal * 0.18); // 18% standard GST for auto spares
  const grandTotal = subtotal + gstTax;

  const mechanicCommission = selectedMechanic
    ? Math.round((subtotal * selectedMechanic.commissionPercentage) / 100)
    : 0;

  const handleGenerateInvoice = () => {
    setInvoiceSuccess(true);
    setTimeout(() => setInvoiceSuccess(false), 5000);
  };

  return (
    <div className="space-y-6">
      <PageHeading
        title="POS Billing Counter"
        subtitle="Fast thermal billing, stock deduction, and mechanic commission calculation"
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

      {invoiceSuccess && (
        <div className="glass-card rounded-2xl p-4 bg-emerald-500/15 border border-emerald-400/30 flex items-center gap-3">
          <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />
          <div className="text-xs">
            <span className="font-bold text-white">Invoice #INV-2026-8891 Generated!</span>{" "}
            <span className="text-emerald-200">
              Stock automatically deducted, ledger updated, and mechanic commission
              credited.
            </span>
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
                    {initialMechanics.map((m) => (
                      <option key={m.id} value={m.id} className="bg-slate-900">
                        {m.garageName} ({m.commissionPercentage}%)
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Quick Barcode Scanner Input */}
            <form onSubmit={handleBarcodeSubmit} className="pt-2 flex gap-2">
              <div className="relative flex-1">
                <Barcode
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sky-400"
                  size={18}
                />
                <input
                  type="text"
                  value={barcodeInput}
                  onChange={(e) => setBarcodeInput(e.target.value)}
                  placeholder="Scan barcode or type part # (e.g. 8901234001021)..."
                  className="glass-input h-11 w-full pl-11 pr-4 rounded-xl text-xs sm:text-sm font-mono placeholder:font-sans"
                />
              </div>
              <GlassButton
                type="submit"
                variant="primary"
                size="md"
                icon={<Plus size={16} />}
              >
                Scan Add
              </GlassButton>
            </form>
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
                No items added yet. Scan a barcode or search to add parts to bill.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-sans min-w-[550px]">
                  <thead className="text-slate-400 font-mono uppercase border-b border-white/5 text-[11px]">
                    <tr>
                      <th className="py-2.5 px-3">Item / Part</th>
                      <th className="py-2.5 px-3">Rack</th>
                      <th className="py-2.5 px-3">Qty</th>
                      <th className="py-2.5 px-3">Unit Rate</th>
                      <th className="py-2.5 px-3">Disc %</th>
                      <th className="py-2.5 px-3">Amount</th>
                      <th className="py-2.5 px-3 text-right"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 font-mono">
                    {items.map((row, idx) => {
                      const itemSub = row.part.sellingPrice * row.quantity;
                      const discAmount = (itemSub * row.discount) / 100;
                      const rowTotal = itemSub - discAmount;

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
                          <td className="py-3 px-3">
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/10 text-sky-300">
                              {row.part.rackNumber}
                            </span>
                          </td>
                          <td className="py-3 px-3">
                            <input
                              type="number"
                              min="1"
                              value={row.quantity}
                              onChange={(e) =>
                                handleQuantityChange(
                                  idx,
                                  parseInt(e.target.value) || 1
                                )
                              }
                              className="glass-input h-8 w-14 rounded-lg text-center font-bold"
                            />
                          </td>
                          <td className="py-3 px-3 text-slate-300 font-medium">
                            {formatRupees(row.part.sellingPrice)}
                          </td>
                          <td className="py-3 px-3">
                            <input
                              type="number"
                              min="0"
                              max="100"
                              value={row.discount}
                              onChange={(e) =>
                                handleDiscountChange(
                                  idx,
                                  parseFloat(e.target.value) || 0
                                )
                              }
                              className="glass-input h-8 w-14 rounded-lg text-center"
                            />
                          </td>
                          <td className="py-3 px-3 font-bold text-white">
                            {formatRupees(rowTotal)}
                          </td>
                          <td className="py-3 px-3 text-right">
                            <button
                              onClick={() => handleRemoveItem(idx)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                              aria-label="Remove item"
                            >
                              <Trash2 size={15} />
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

        {/* Right Column: Liquid Glass Receipt & Payout Summary */}
        <div className="space-y-4">
          <GlassCard className="p-6">
            <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-5">
              <div>
                <h3 className="text-base font-extrabold text-white">
                  Invoice Summary
                </h3>
                <p className="text-xs text-slate-400 font-mono">
                  TAX INVOICE · GSTIN: 29ABCDE1234F1Z5
                </p>
              </div>
              <span className="px-2.5 py-1 rounded-full text-[10px] font-mono font-bold bg-sky-500/20 text-sky-400 border border-sky-400/30">
                #INV-2026-8891
              </span>
            </div>

            <div className="space-y-3.5 text-xs font-mono">
              <div className="flex justify-between text-slate-400 font-sans">
                <span>Taxable Value (Subtotal)</span>
                <span className="text-white font-mono font-bold">
                  {formatRupees(subtotal)}
                </span>
              </div>

              <div className="flex justify-between text-slate-400 font-sans">
                <span>Integrated GST (18%)</span>
                <span className="text-white font-mono font-bold">
                  {formatRupees(gstTax)}
                </span>
              </div>

              {selectedMechanic && (
                <div className="flex justify-between text-purple-400 font-sans bg-purple-500/10 p-2 rounded-xl border border-purple-500/20">
                  <span>
                    Mechanic Share ({selectedMechanic.commissionPercentage}%)
                  </span>
                  <span className="font-mono font-bold">
                    {formatRupees(mechanicCommission)}
                  </span>
                </div>
              )}

              <div className="border-t border-dashed border-white/15 my-3" />

              <div className="flex items-baseline justify-between pt-1">
                <div>
                  <span className="text-sm font-extrabold text-white uppercase tracking-wider font-sans block">
                    Grand Total
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">
                    Includes all GST & charges
                  </span>
                </div>
                <span className="text-3xl font-extrabold text-white font-mono tracking-tight text-right text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-emerald-400">
                  {formatRupees(grandTotal)}
                </span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="mt-6 space-y-2.5">
              <GlassButton
                variant="primary"
                size="lg"
                className="w-full text-sm font-bold shadow-[0_10px_30px_rgba(56,189,248,0.35)]"
                onClick={handleGenerateInvoice}
              >
                Generate & Settle Bill (F10)
              </GlassButton>
              <GlassButton
                variant="secondary"
                size="md"
                className="w-full text-xs font-semibold"
                onClick={() => alert("Bill saved as draft!")}
              >
                Save as Open Draft
              </GlassButton>
            </div>
          </GlassCard>
        </div>
      </div>
    </div>
  );
}
