export type NavigationSection =
  | "Dashboard"
  | "Inventory"
  | "Billing"
  | "Suppliers"
  | "Mechanics"
  | "Reports"
  | "Settings";

export type StockStatus = "In Stock" | "Low Stock" | "Out of Stock";

export interface SparePart {
  id: string;
  name: string;
  brand: "Hero" | "Honda" | "TVS" | "Rollon" | "Bajaj" | "Castrol" | "Local";
  partNumber: string;
  modelNumber: string;
  compatibleBikes: string;
  quantity: number;
  rackNumber: string;
  purchasePrice: number;
  sellingPrice: number;
  customerDiscount: number;
  mechanicDiscount: number;
  status: StockStatus;
  barcode: string;
}

export interface Supplier {
  id: string;
  name: string;
  contactName: string;
  mobile: string;
  address: string;
  gstNumber: string;
  totalPurchases: number;
}

export interface Mechanic {
  id: string;
  name: string;
  garageName: string;
  mobile: string;
  commissionPercentage: number;
  pendingCommission: number;
}

export interface SalesTrendData {
  day: string;
  sales: number;
  purchase: number;
}

export interface BrandShare {
  name: string;
  value: number;
  color: string;
}

export interface BillItem {
  part: SparePart;
  quantity: number;
  discount: number;
}

export interface ReportItem {
  id: string;
  title: string;
  description: string;
  period: string;
  category: "sales" | "inventory" | "commission" | "purchases";
}
