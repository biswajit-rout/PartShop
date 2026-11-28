"use client";

import React, { useState, useEffect } from "react";
import { Mechanic, Brand, MechanicItemRecord, MechanicSummary } from "@/types";
import { formatRupees } from "@/utils/formatters";
import { mechanicsApi, brandsApi } from "@/api";
import PageHeading from "@/components/common/PageHeading";
import GlassButton from "@/components/ui/glass/GlassButton";
import GlassInput from "@/components/ui/glass/GlassInput";
import GlassCard from "@/components/ui/glass/GlassCard";
import {
  Wrench,
  Plus,
  Phone,
  Calendar,
  Layers,
  CheckCircle,
  AlertCircle,
  X,
  Edit2,
  Trash2,
  Eye,
  FileSpreadsheet,
  TrendingUp,
  PackageCheck,
  Percent,
} from "lucide-react";

export default function MechanicsView() {
  const [mechanics, setMechanics] = useState<Mechanic[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchFilter, setSearchFilter] = useState("");

  // Add Mechanic Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [newMech, setNewMech] = useState({
    name: "",
    phone: "",
    garage_name: "",
    address: "",
    default_commission_percentage: "5.00",
    commissions: [] as { brand_id: number; commission_percentage: string }[],
  });

  // Edit Mechanic Modal State
  const [editingMech, setEditingMech] = useState<Mechanic | null>(null);
  const [editError, setEditError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    name: "",
    phone: "",
    garage_name: "",
    address: "",
    default_commission_percentage: "5.00",
    commissions: [] as { brand_id: number; commission_percentage: string }[],
  });

  // Mechanic Details & Item Ledger Modal State
  const [ledgerMech, setLedgerMech] = useState<Mechanic | null>(null);
  const [ledgerSummary, setLedgerSummary] = useState<MechanicSummary | null>(null);
  const [ledgerItems, setLedgerItems] = useState<MechanicItemRecord[]>([]);
  const [isLedgerLoading, setIsLedgerLoading] = useState(false);
  const [ledgerStartDate, setLedgerStartDate] = useState<string>("");
  const [ledgerEndDate, setLedgerEndDate] = useState<string>("");
  const [datePreset, setDatePreset] = useState<"all" | "today" | "7days" | "30days">("all");

  // Load live data from PostgreSQL
  const loadData = async () => {
    setIsLoading(true);
    try {
      const [mechsData, brandsData] = await Promise.all([
        mechanicsApi.getAll(),
        brandsApi.getAll(),
      ]);
      setMechanics(mechsData);
      setBrands(brandsData);
    } catch (err) {
      console.warn("Failed to fetch mechanics or brands:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filtered mechanics
  const filteredMechanics = mechanics.filter((m) => {
    const q = searchFilter.toLowerCase().trim();
    if (!q) return true;
    return (
      m.name.toLowerCase().includes(q) ||
      m.garageName.toLowerCase().includes(q) ||
      (m.phone && m.phone.toLowerCase().includes(q))
    );
  });

  // Add Mechanic Form Handlers
  const handleAddCommissionRow = () => {
    if (brands.length === 0) return;
    setNewMech((prev) => ({
      ...prev,
      commissions: [
        ...prev.commissions,
        { brand_id: brands[0].id, commission_percentage: "8.00" },
      ],
    }));
  };

  const handleRemoveCommissionRow = (index: number) => {
    setNewMech((prev) => ({
      ...prev,
      commissions: prev.commissions.filter((_, i) => i !== index),
    }));
  };

  const handleCommissionChange = (
    index: number,
    field: "brand_id" | "commission_percentage",
    value: any
  ) => {
    setNewMech((prev) => {
      const updated = [...prev.commissions];
      updated[index] = { ...updated[index], [field]: value };
      return { ...prev, commissions: updated };
    });
  };

  const handleCreateMechanic = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMech.name.trim() || !newMech.phone.trim()) {
      setAddError("Mechanic Name and Mobile Phone are required.");
      return;
    }

    setIsSubmitting(true);
    setAddError(null);

    try {
      await mechanicsApi.create({
        name: newMech.name.trim(),
        phone: newMech.phone.trim(),
        garage_name: newMech.garage_name.trim() || undefined,
        address: newMech.address.trim() || undefined,
        default_commission_percentage: parseFloat(newMech.default_commission_percentage) || 5,
        commissions: newMech.commissions.map((c) => ({
          brand_id: Number(c.brand_id),
          commission_percentage: parseFloat(c.commission_percentage) || 0,
        })),
      });

      setShowAddModal(false);
      setNewMech({
        name: "",
        phone: "",
        garage_name: "",
        address: "",
        default_commission_percentage: "5.00",
        commissions: [],
      });
      await loadData();
    } catch (err: any) {
      setAddError(err.message || "Failed to create mechanic partner.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Edit Mechanic Handlers
  const handleOpenEditModal = (m: Mechanic) => {
    setEditingMech(m);
    setEditForm({
      name: m.name,
      phone: m.phone || m.mobile,
      garage_name: m.garageName || "",
      address: m.address || "",
      default_commission_percentage: String(m.defaultCommissionPercentage || 5),
      commissions: (m.brandCommissions || []).map((bc) => ({
        brand_id: bc.brandId,
        commission_percentage: String(bc.commissionPercentage),
      })),
    });
    setEditError(null);
  };

  const handleEditCommissionRowAdd = () => {
    if (brands.length === 0) return;
    setEditForm((prev) => ({
      ...prev,
      commissions: [
        ...prev.commissions,
        { brand_id: brands[0].id, commission_percentage: "8.00" },
      ],
    }));
  };

  const handleEditCommissionRowRemove = (index: number) => {
    setEditForm((prev) => ({
      ...prev,
      commissions: prev.commissions.filter((_, i) => i !== index),
    }));
  };

  const handleEditCommissionChange = (
    index: number,
    field: "brand_id" | "commission_percentage",
    value: any
  ) => {
    setEditForm((prev) => {
      const updated = [...prev.commissions];
      updated[index] = { ...updated[index], [field]: value };
      return { ...prev, commissions: updated };
    });
  };

  const handleUpdateMechanic = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMech) return;

    setIsEditing(true);
    setEditError(null);

    try {
      await mechanicsApi.update(editingMech.id, {
        name: editForm.name.trim(),
        phone: editForm.phone.trim(),
        garage_name: editForm.garage_name.trim() || undefined,
        address: editForm.address.trim() || undefined,
        default_commission_percentage: parseFloat(editForm.default_commission_percentage) || 5,
        commissions: editForm.commissions.map((c) => ({
          brand_id: Number(c.brand_id),
          commission_percentage: parseFloat(c.commission_percentage) || 0,
        })),
      });

      setEditingMech(null);
      await loadData();
    } catch (err: any) {
      setEditError(err.message || "Failed to update mechanic.");
    } finally {
      setIsEditing(false);
    }
  };

  // Open Mechanic Details / Ledger Modal
  const handleOpenLedger = async (m: Mechanic) => {
    setLedgerMech(m);
    setDatePreset("all");
    setLedgerStartDate("");
    setLedgerEndDate("");
    await fetchLedgerData(m.id);
  };

  const fetchLedgerData = async (mechId: string | number, start?: string, end?: string) => {
    setIsLedgerLoading(true);
    try {
      const [summary, items] = await Promise.all([
        mechanicsApi.getSummary(mechId, { start_date: start, end_date: end }),
        mechanicsApi.getItems(mechId, { start_date: start, end_date: end }),
      ]);
      setLedgerSummary(summary);
      setLedgerItems(items);
    } catch (err) {
      console.warn("Failed to fetch mechanic ledger:", err);
    } finally {
      setIsLedgerLoading(false);
    }
  };

  const handleDatePresetChange = (preset: "all" | "today" | "7days" | "30days") => {
    if (!ledgerMech) return;
    setDatePreset(preset);

    const now = new Date();
    let start = "";
    let end = now.toISOString().split("T")[0];

    if (preset === "today") {
      start = end;
    } else if (preset === "7days") {
      const d = new Date();
      d.setDate(d.getDate() - 7);
      start = d.toISOString().split("T")[0];
    } else if (preset === "30days") {
      const d = new Date();
      d.setDate(d.getDate() - 30);
      start = d.toISOString().split("T")[0];
    } else {
      start = "";
      end = "";
    }

    setLedgerStartDate(start);
    setLedgerEndDate(end);
    fetchLedgerData(ledgerMech.id, start || undefined, end || undefined);
  };

  const handleCustomDateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ledgerMech) return;
    fetchLedgerData(
      ledgerMech.id,
      ledgerStartDate || undefined,
      ledgerEndDate || undefined
    );
  };

  return (
    <div className="space-y-6">
      <PageHeading
        title="Mechanic Partners & Commissions"
        subtitle={`${mechanics.length} active garage partners · Custom brand commission percentages`}
        badge="COMMISSION MATRIX"
        action={
          <GlassButton
            variant="primary"
            size="sm"
            icon={<Plus size={15} />}
            onClick={() => setShowAddModal(true)}
          >
            + Add Mechanic
          </GlassButton>
        }
      />

      {/* Search and Overview Bar */}
      <div className="glass-panel rounded-3xl p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative flex-1 w-full">
          <input
            type="text"
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            placeholder="Search mechanics by name, garage, or contact number..."
            className="glass-input h-10 w-full pl-4 pr-4 rounded-xl text-xs sm:text-sm font-sans"
          />
        </div>
        <div className="text-xs text-slate-400 font-mono shrink-0">
          Total Registered: <span className="text-white font-bold">{mechanics.length}</span>
        </div>
      </div>

      {/* Mechanics Table */}
      <div className="glass-panel rounded-3xl overflow-hidden border border-white/10">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-sans min-w-[850px]">
            <thead className="bg-white/[0.03] text-slate-400 font-mono uppercase border-b border-white/10 text-[11px]">
              <tr>
                <th className="py-3.5 px-4">Garage / Workshop</th>
                <th className="py-3.5 px-4">Mechanic Name</th>
                <th className="py-3.5 px-4">Contact Phone</th>
                <th className="py-3.5 px-4">Default Comm.</th>
                <th className="py-3.5 px-4">Brand Overrides</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 font-mono">
              {filteredMechanics.map((mech) => {
                const commissionRules = mech.brandCommissions || [];

                return (
                  <tr
                    key={mech.id}
                    className="hover:bg-white/[0.04] transition-colors"
                  >
                    <td className="py-4 px-4 font-sans">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-purple-500/15 border border-purple-400/25 flex items-center justify-center text-purple-400 shrink-0">
                          <Wrench size={16} />
                        </div>
                        <div>
                          <div className="font-bold text-white text-sm">
                            {mech.garageName || mech.name}
                          </div>
                          {mech.address && (
                            <div className="text-[11px] text-slate-400 truncate max-w-[200px]">
                              {mech.address}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-4 font-sans text-slate-200 font-medium">
                      {mech.name}
                    </td>
                    <td className="py-4 px-4 text-sky-400">
                      <span className="flex items-center gap-1.5 font-mono">
                        <Phone size={12} className="text-slate-500" />
                        {mech.phone || mech.mobile}
                      </span>
                    </td>
                    <td className="py-4 px-4">
                      <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-sky-500/15 text-sky-300 border border-sky-400/25">
                        {mech.defaultCommissionPercentage || mech.commissionPercentage}%
                      </span>
                    </td>
                    <td className="py-4 px-4">
                      {commissionRules.length === 0 ? (
                        <span className="text-slate-500 text-[11px]">Standard rate only</span>
                      ) : (
                        <div className="flex flex-wrap gap-1 max-w-[280px]">
                          {commissionRules.map((bc, i) => (
                            <span
                              key={i}
                              className="px-1.5 py-0.5 rounded bg-white/10 text-slate-200 text-[10px] font-mono border border-white/5"
                            >
                              {bc.brandName || `Brand #${bc.brandId}`}: <span className="text-purple-300 font-bold">{bc.commissionPercentage}%</span>
                            </span>
                          ))}
                        </div>
                      )}
                    </td>
                    <td className="py-4 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <GlassButton
                          size="sm"
                          variant="secondary"
                          icon={<Eye size={13} />}
                          onClick={() => handleOpenLedger(mech)}
                        >
                          View Ledger
                        </GlassButton>
                        <GlassButton
                          size="sm"
                          variant="secondary"
                          icon={<Edit2 size={13} />}
                          onClick={() => handleOpenEditModal(mech)}
                        >
                          Edit
                        </GlassButton>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Mechanic Modal with Brand Commission Matrix */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
          <GlassCard className="w-full max-w-xl p-6 border-white/20 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-white/10">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Wrench size={18} className="text-purple-400" />
                Register Mechanic Partner
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            {addError && (
              <div className="mb-4 p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-xs text-rose-300">
                {addError}
              </div>
            )}

            <form onSubmit={handleCreateMechanic} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <GlassInput
                  label="Mechanic Name *"
                  placeholder="e.g. Ramesh Sharma"
                  value={newMech.name}
                  onChange={(e) => setNewMech({ ...newMech, name: e.target.value })}
                  required
                />
                <GlassInput
                  label="Mobile Contact *"
                  placeholder="e.g. +91 98765 43210"
                  value={newMech.phone}
                  onChange={(e) => setNewMech({ ...newMech, phone: e.target.value })}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <GlassInput
                  label="Garage / Workshop Name"
                  placeholder="e.g. Ramesh Auto Care"
                  value={newMech.garage_name}
                  onChange={(e) => setNewMech({ ...newMech, garage_name: e.target.value })}
                />
                <GlassInput
                  label="Default Commission (%) *"
                  type="number"
                  step="0.1"
                  placeholder="5.00"
                  value={newMech.default_commission_percentage}
                  onChange={(e) =>
                    setNewMech({
                      ...newMech,
                      default_commission_percentage: e.target.value,
                    })
                  }
                  required
                />
              </div>

              <GlassInput
                label="Workshop Address"
                placeholder="Shop number, street, or landmark"
                value={newMech.address}
                onChange={(e) => setNewMech({ ...newMech, address: e.target.value })}
              />

              {/* Brand-Specific Commission Override Matrix */}
              <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-white uppercase font-mono tracking-wider">
                      Brand-Specific Commission Rates
                    </h4>
                    <p className="text-[11px] text-slate-400">
                      Assign different percentages for specific spare brands (e.g. Hero: 8%, Endurance: 12%).
                    </p>
                  </div>
                  <GlassButton
                    type="button"
                    size="sm"
                    variant="secondary"
                    icon={<Plus size={13} />}
                    onClick={handleAddCommissionRow}
                  >
                    + Add Brand Rate
                  </GlassButton>
                </div>

                {newMech.commissions.length === 0 ? (
                  <div className="py-3 text-center text-slate-500 text-xs italic font-sans">
                    No brand overrides added. Default {newMech.default_commission_percentage}% will apply to all parts.
                  </div>
                ) : (
                  <div className="space-y-2 pt-1">
                    {newMech.commissions.map((comm, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <select
                          value={comm.brand_id}
                          onChange={(e) =>
                            handleCommissionChange(idx, "brand_id", Number(e.target.value))
                          }
                          className="glass-input h-9 flex-1 px-3 rounded-xl text-xs font-mono text-slate-200 outline-none"
                        >
                          {brands.map((b) => (
                            <option key={b.id} value={b.id} className="bg-slate-900">
                              {b.name}
                            </option>
                          ))}
                        </select>
                        <div className="w-28 relative">
                          <input
                            type="number"
                            step="0.1"
                            value={comm.commission_percentage}
                            onChange={(e) =>
                              handleCommissionChange(idx, "commission_percentage", e.target.value)
                            }
                            placeholder="%"
                            className="glass-input h-9 w-full px-3 pr-6 rounded-xl text-xs font-mono text-white text-right outline-none"
                          />
                          <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs pointer-events-none">
                            %
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveCommissionRow(idx)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 transition-colors"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
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
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Registering..." : "Save Mechanic Partner"}
                </GlassButton>
              </div>
            </form>
          </GlassCard>
        </div>
      )}

      {/* Edit Mechanic Modal */}
      {editingMech && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
          <GlassCard className="w-full max-w-xl p-6 border-white/20 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-white/10">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Edit2 size={18} className="text-sky-400" />
                Edit Mechanic & Brand Percentages
              </h3>
              <button
                onClick={() => setEditingMech(null)}
                className="text-slate-400 hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            {editError && (
              <div className="mb-4 p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-xs text-rose-300">
                {editError}
              </div>
            )}

            <form onSubmit={handleUpdateMechanic} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <GlassInput
                  label="Mechanic Name *"
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  required
                />
                <GlassInput
                  label="Mobile Contact *"
                  value={editForm.phone}
                  onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <GlassInput
                  label="Garage / Workshop Name"
                  value={editForm.garage_name}
                  onChange={(e) => setEditForm({ ...editForm, garage_name: e.target.value })}
                />
                <GlassInput
                  label="Default Commission (%) *"
                  type="number"
                  step="0.1"
                  value={editForm.default_commission_percentage}
                  onChange={(e) =>
                    setEditForm({
                      ...editForm,
                      default_commission_percentage: e.target.value,
                    })
                  }
                  required
                />
              </div>

              <GlassInput
                label="Workshop Address"
                value={editForm.address}
                onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
              />

              {/* Brand-Specific Commission Override Matrix */}
              <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-white uppercase font-mono tracking-wider">
                      Brand Commission Overrides
                    </h4>
                    <p className="text-[11px] text-slate-400">
                      Set specific percentages for this mechanic per brand.
                    </p>
                  </div>
                  <GlassButton
                    type="button"
                    size="sm"
                    variant="secondary"
                    icon={<Plus size={13} />}
                    onClick={handleEditCommissionRowAdd}
                  >
                    + Add Brand Rate
                  </GlassButton>
                </div>

                <div className="space-y-2 pt-1">
                  {editForm.commissions.map((comm, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <select
                        value={comm.brand_id}
                        onChange={(e) =>
                          handleEditCommissionChange(idx, "brand_id", Number(e.target.value))
                        }
                        className="glass-input h-9 flex-1 px-3 rounded-xl text-xs font-mono text-slate-200 outline-none"
                      >
                        {brands.map((b) => (
                          <option key={b.id} value={b.id} className="bg-slate-900">
                            {b.name}
                          </option>
                        ))}
                      </select>
                      <div className="w-28 relative">
                        <input
                          type="number"
                          step="0.1"
                          value={comm.commission_percentage}
                          onChange={(e) =>
                            handleEditCommissionChange(idx, "commission_percentage", e.target.value)
                          }
                          className="glass-input h-9 w-full px-3 pr-6 rounded-xl text-xs font-mono text-white text-right outline-none"
                        />
                        <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs pointer-events-none">
                          %
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleEditCommissionRowRemove(idx)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-3 flex justify-end gap-2.5">
                <GlassButton
                  type="button"
                  variant="secondary"
                  onClick={() => setEditingMech(null)}
                >
                  Cancel
                </GlassButton>
                <GlassButton
                  type="submit"
                  variant="primary"
                  disabled={isEditing}
                >
                  {isEditing ? "Saving Changes..." : "Save Changes"}
                </GlassButton>
              </div>
            </form>
          </GlassCard>
        </div>
      )}

      {/* Mechanic Details & Date-Wise Item Ledger Modal */}
      {ledgerMech && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
          <GlassCard className="w-full max-w-4xl p-6 border-white/20 shadow-2xl relative max-h-[92vh] overflow-y-auto space-y-5">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-purple-500/20 border border-purple-400/30 flex items-center justify-center text-purple-400">
                  <Wrench size={20} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">
                    {ledgerMech.garageName || ledgerMech.name} — Parts & Commission Ledger
                  </h3>
                  <p className="text-xs text-slate-400 font-mono">
                    Mechanic: {ledgerMech.name} · Contact: {ledgerMech.phone || ledgerMech.mobile}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setLedgerMech(null)}
                className="text-slate-400 hover:text-white"
              >
                <X size={20} />
              </button>
            </div>

            {/* Brand Commission Rates Pill Bar */}
            <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/10 flex flex-wrap items-center gap-2">
              <span className="text-[11px] font-bold text-slate-400 uppercase font-mono">
                Assigned Brand Rates:
              </span>
              <span className="px-2 py-0.5 rounded-md bg-sky-500/15 text-sky-300 font-mono text-xs font-bold border border-sky-400/25">
                Default: {ledgerMech.defaultCommissionPercentage || ledgerMech.commissionPercentage}%
              </span>
              {(ledgerMech.brandCommissions || []).map((bc, i) => (
                <span
                  key={i}
                  className="px-2 py-0.5 rounded-md bg-purple-500/15 text-purple-200 font-mono text-xs border border-purple-400/25"
                >
                  {bc.brandName}: <span className="font-bold text-purple-400">{bc.commissionPercentage}%</span>
                </span>
              ))}
            </div>

            {/* Date Range Filter Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-2xl bg-white/[0.02] border border-white/10">
              <div className="flex items-center gap-1.5 text-xs font-sans">
                <span className="text-slate-400 text-[11px] font-mono uppercase mr-1">Period:</span>
                <button
                  onClick={() => handleDatePresetChange("all")}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                    datePreset === "all"
                      ? "bg-sky-500/20 text-sky-300 border border-sky-400/30"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  All Time
                </button>
                <button
                  onClick={() => handleDatePresetChange("today")}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                    datePreset === "today"
                      ? "bg-sky-500/20 text-sky-300 border border-sky-400/30"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  Today
                </button>
                <button
                  onClick={() => handleDatePresetChange("7days")}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                    datePreset === "7days"
                      ? "bg-sky-500/20 text-sky-300 border border-sky-400/30"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  Last 7 Days
                </button>
                <button
                  onClick={() => handleDatePresetChange("30days")}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                    datePreset === "30days"
                      ? "bg-sky-500/20 text-sky-300 border border-sky-400/30"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  Last 30 Days
                </button>
              </div>

              <form onSubmit={handleCustomDateSubmit} className="flex items-center gap-2">
                <input
                  type="date"
                  value={ledgerStartDate}
                  onChange={(e) => setLedgerStartDate(e.target.value)}
                  className="glass-input h-8 px-2.5 rounded-lg text-xs font-mono text-slate-200 outline-none"
                />
                <span className="text-slate-500 text-xs">to</span>
                <input
                  type="date"
                  value={ledgerEndDate}
                  onChange={(e) => setLedgerEndDate(e.target.value)}
                  className="glass-input h-8 px-2.5 rounded-lg text-xs font-mono text-slate-200 outline-none"
                />
                <GlassButton size="sm" variant="secondary" type="submit">
                  Filter
                </GlassButton>
              </form>
            </div>

            {/* Performance KPI Cards */}
            {ledgerSummary && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                <div className="p-4 rounded-2xl bg-white/[0.04] border border-white/10">
                  <span className="text-[11px] font-mono text-slate-400 uppercase">
                    Total Parts Taken
                  </span>
                  <div className="text-2xl font-bold text-white mt-1">
                    {ledgerSummary.totalItemsTaken}{" "}
                    <span className="text-xs text-slate-400 font-normal">units</span>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-white/[0.04] border border-white/10">
                  <span className="text-[11px] font-mono text-slate-400 uppercase">
                    Total Billing Volume
                  </span>
                  <div className="text-2xl font-bold text-sky-400 mt-1 font-mono">
                    {formatRupees(ledgerSummary.totalSalesVolume)}
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-purple-500/10 border border-purple-400/20">
                  <span className="text-[11px] font-mono text-purple-300 uppercase">
                    Total Commission Earned
                  </span>
                  <div className="text-2xl font-bold text-amber-300 mt-1 font-mono">
                    {formatRupees(ledgerSummary.totalCommissionEarned)}
                  </div>
                </div>
              </div>
            )}

            {/* Date-Wise Items Taken Table */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-white uppercase font-mono tracking-wider">
                  Date-Wise Parts Sold & Commission Breakdown ({ledgerItems.length})
                </h4>
              </div>

              {isLedgerLoading ? (
                <div className="py-12 text-center text-slate-400 text-xs font-mono">
                  Loading mechanic ledger from database...
                </div>
              ) : ledgerItems.length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-xs font-sans">
                  No parts recorded for this mechanic partner within the selected timeframe.
                </div>
              ) : (
                <div className="overflow-x-auto rounded-2xl border border-white/10">
                  <table className="w-full text-left text-xs font-sans min-w-[750px]">
                    <thead className="bg-white/[0.04] text-slate-400 font-mono uppercase text-[10px] border-b border-white/10">
                      <tr>
                        <th className="py-2.5 px-3">Date & Time</th>
                        <th className="py-2.5 px-3">Invoice #</th>
                        <th className="py-2.5 px-3">Item / Part</th>
                        <th className="py-2.5 px-3">Brand</th>
                        <th className="py-2.5 px-3">Qty</th>
                        <th className="py-2.5 px-3">Unit Price</th>
                        <th className="py-2.5 px-3">Line Total</th>
                        <th className="py-2.5 px-3">Commission %</th>
                        <th className="py-2.5 px-3 text-right">Commission (₹)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 font-mono text-[11px]">
                      {ledgerItems.map((row, idx) => (
                        <tr key={idx} className="hover:bg-white/[0.03]">
                          <td className="py-3 px-3 text-slate-300 whitespace-nowrap">
                            {new Date(row.date).toLocaleDateString("en-IN", {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </td>
                          <td className="py-3 px-3 text-sky-400 font-bold whitespace-nowrap">
                            {row.invoiceNumber}
                          </td>
                          <td className="py-3 px-3 font-sans">
                            <span className="font-semibold text-white block">{row.itemName}</span>
                            <span className="text-[10px] text-slate-400 font-mono">{row.partNumber}</span>
                          </td>
                          <td className="py-3 px-3">
                            <span className="px-1.5 py-0.5 rounded bg-white/10 text-slate-200">
                              {row.brandName}
                            </span>
                          </td>
                          <td className="py-3 px-3 font-bold text-white">
                            {row.quantity}
                          </td>
                          <td className="py-3 px-3 text-slate-300">
                            {formatRupees(row.unitPrice)}
                          </td>
                          <td className="py-3 px-3 font-bold text-white">
                            {formatRupees(row.totalPrice)}
                          </td>
                          <td className="py-3 px-3">
                            <span className="px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 font-bold text-[10px]">
                              {row.commissionPercentage}%
                            </span>
                          </td>
                          <td className="py-3 px-3 text-right font-bold text-amber-300 text-xs">
                            {formatRupees(row.commissionAmount)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </GlassCard>
        </div>
      )}
    </div>
  );
}
