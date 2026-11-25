export type NavigationSection =
  | "Dashboard"
  | "Inventory"
  | "Billing"
  | "Suppliers"
  | "Mechanics"
  | "Reports"
  | "Settings";

export type StockStatus = "In Stock" | "Low Stock" | "Out of Stock";
export type BrandName = "Hero" | "Honda" | "TVS" | "Rollon" | "Bajaj" | "Castrol" | "Bosch" | "Motul" | "NGK" | string;

export interface SparePart {
  id: string;
  name: string;
  brand: BrandName;
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

export interface Brand {
  id: number;
  name: string;
  code?: string;
  description?: string;
  createdAt?: string;
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

export interface MechanicBrandCommission {
  id?: number;
  mechanicId?: number;
  brandId: number;
  brandName?: string;
  commissionPercentage: number;
}

export interface Mechanic {
  id: string;
  name: string;
  garageName: string;
  mobile: string;
  phone?: string;
  address?: string;
  defaultCommissionPercentage?: number;
  commissionPercentage: number;
  pendingCommission: number;
  isActive?: boolean;
  brandCommissions?: MechanicBrandCommission[];
}

export interface MechanicItemRecord {
  saleId: number;
  invoiceNumber: string;
  date: string;
  sparePartId: number;
  itemName: string;
  partNumber: string;
  brandName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  commissionPercentage: number;
  commissionAmount: number;
  customerName?: string;
  customerPhone?: string;
}

export interface MechanicSummary {
  mechanicId: number;
  mechanicName: string;
  garageName?: string;
  totalItemsTaken: number;
  totalSalesVolume: number;
  totalCommissionEarned: number;
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
