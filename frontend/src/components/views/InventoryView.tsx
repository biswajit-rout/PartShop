import React, { useState } from "react";
import { SparePart } from "@/types";
import { formatRupees } from "@/utils/formatters";
import PageHeading from "@/components/common/PageHeading";
import GlassBadge from "@/components/ui/glass/GlassBadge";
import GlassButton from "@/components/ui/glass/GlassButton";
import {
  Search,
  Download,
  Upload,
  Plus,
  Filter,
  CheckCircle2,
  Package,
} from "lucide-react";

interface InventoryViewProps {
  products: SparePart[];
  searchQuery: string;
  onSearchChange: (value: string) => void;
}

export default function InventoryView({
  products,
  searchQuery,
  onSearchChange,
}: InventoryViewProps) {
  const [selectedBrand, setSelectedBrand] = useState<string>("All");
  const [selectedStatus, setSelectedStatus] = useState<string>("All");
  const [showImportNotice, setShowImportNotice] = useState<boolean>(false);

  const filteredProducts = products.filter((item) => {
    const matchesSearch = `${item.name} ${item.brand} ${item.partNumber} ${item.modelNumber} ${item.compatibleBikes} ${item.rackNumber}`
      .toLowerCase()
      .includes(searchQuery.toLowerCase());
    const matchesBrand =
      selectedBrand === "All" || item.brand.toLowerCase() === selectedBrand.toLowerCase();
    const matchesStatus =
      selectedStatus === "All" || item.status === selectedStatus;
    return matchesSearch && matchesBrand && matchesStatus;
  });

  return (
    <div className="space-y-6">
      <PageHeading
        title="Inventory Management"
        subtitle={`${filteredProducts.length} items listed · 1,248 total cataloged SKUs`}
        badge="BARCODE INDEXED"
        action={
          <div className="flex flex-wrap items-center gap-2.5">
            <GlassButton
              variant="secondary"
              size="sm"
              icon={<Download size={14} />}
              onClick={() =>
                alert("Exporting Inventory Catalog to Excel (.xlsx) / CSV...")
              }
            >
              Export
            </GlassButton>
            <GlassButton
              variant="secondary"
              size="sm"
              icon={<Upload size={14} />}
              onClick={() => setShowImportNotice(!showImportNotice)}
            >
              Import Excel
            </GlassButton>
            <GlassButton
              variant="primary"
              size="sm"
              icon={<Plus size={14} />}
              onClick={() =>
                alert("Add Product Modal - Ready to map to POST /api/inventory")
              }
            >
              + Add Part
            </GlassButton>
          </div>
        }
      />

      {/* Excel Import Notice banner if toggled */}
      {showImportNotice && (
        <div className="glass-card rounded-2xl p-4 border border-sky-400/30 bg-sky-500/10 flex items-start gap-3">
          <CheckCircle2 className="w-5 h-5 text-sky-400 shrink-0 mt-0.5" />
          <div className="text-xs">
            <span className="font-bold text-white">
              Excel Import Format Specification:
            </span>{" "}
            <span className="text-slate-300">
              Columns must be: Item Name, Brand, Part Number, Model Number,
              Compatible Bike Models, Quantity, Rack Number, Purchase Price,
              Selling Price, Customer Discount, Mechanic Discount, Supplier Name.
            </span>
          </div>
        </div>
      )}

      {/* Filter and Control Bar */}
      <div className="glass-panel rounded-3xl p-4 sm:p-5 flex flex-col md:flex-row items-stretch md:items-center gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <Search
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
            size={16}
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search by part number, bike model, rack location..."
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
            <option value="Hero" className="bg-slate-900">Hero</option>
            <option value="Honda" className="bg-slate-900">Honda</option>
            <option value="TVS" className="bg-slate-900">TVS</option>
            <option value="Rollon" className="bg-slate-900">Rollon</option>
            <option value="Castrol" className="bg-slate-900">Castrol</option>
            <option value="Local" className="bg-slate-900">Local Brands</option>
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

      {/* Liquid Glass Inventory Table */}
      <div className="glass-panel rounded-3xl overflow-hidden border border-white/10">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-sans min-w-[850px]">
            <thead className="bg-white/[0.03] text-slate-400 font-mono uppercase border-b border-white/10 text-[11px]">
              <tr>
                <th className="py-3.5 px-4">Part / Description</th>
                <th className="py-3.5 px-4">Brand</th>
                <th className="py-3.5 px-4">Part #</th>
                <th className="py-3.5 px-4">Compatible Bikes</th>
                <th className="py-3.5 px-4">Rack Loc.</th>
                <th className="py-3.5 px-4">Stock Qty</th>
                <th className="py-3.5 px-4">Selling Price</th>
                <th className="py-3.5 px-4">Discounts (Cust/Mech)</th>
                <th className="py-3.5 px-4">Status</th>
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
                      Barcode: {item.barcode}
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
                    {item.compatibleBikes}
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
                  <td className="py-3.5 px-4 text-slate-300">
                    <span className="text-sky-300">{item.customerDiscount}%</span> /{" "}
                    <span className="text-amber-300">{item.mechanicDiscount}%</span>
                  </td>
                  <td className="py-3.5 px-4">
                    <GlassBadge status={item.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
