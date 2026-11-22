# PartShop — UI/UX Design System & Architectural Guidelines

> **Application**: PartShop (Motorcycle Spare Parts Inventory, Billing & Commission ERP)  
> **Aesthetic**: Liquid Glass (Fluid Glassmorphic Dark System)  
> **Frontend Stack**: Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS v4, PostCSS, Recharts, Lucide Icons  
> **Last Updated**: November 2026

---

## 1. Design Philosophy: Liquid Glass for Industrial Retail & POS

Traditional "glassmorphism" often suffers from poor text legibility, flat grey frosted plastic surfaces, and excessive visual noise. For **PartShop**, a retail counter application where counter operators, cashiers, and shop owners spend 8–10 hours daily scanning barcodes, managing stock, and issuing GST invoices, the design system adheres to the **"Liquid Glass" Standard**:

1. **Illuminated Refractive Surfaces**: Glass is not just a grey translucent box; it is an optically simulated surface with directional top-edge specular gleams, ambient refraction of background color mesh orbs, and enhanced color saturation (`backdrop-saturate(180%)`).
2. **High-Contrast POS Ergonomics**: High data density (tables, part numbers, rack locations, currency values) requires strict contrast ratios (WCAG AA compliant). Transparent panels use deep tinted backdrops (`rgba(11, 17, 30, 0.75)`) so numbers and labels pop with absolute clarity.
3. **Hardware & Printer Awareness**: Glass styling is strictly isolated to on-screen interactions. When generating customer thermal receipts (80mm/58mm ESC/POS) or A4 tax invoices, all frosted glass, blur, and dark background fills are automatically stripped via `@media print`.
4. **Fluid Micro-Interactions**: Rounded continuous curvatures (`rounded-2xl`, `rounded-3xl`), subtle hover elevation, tactile active states (`active:scale-[0.98]`), and neon focus rings for fast barcode keyboard navigation.

---

## 2. Multi-Layer Optical Hierarchy

The interface is structured in distinct z-index optical strata:

```
[Layer 5: Floating Navigation Docks]   --> GlassSidebar (z-50), GlassHeader (z-30)
[Layer 4: Actions & Micro-Controls]    --> GlassButton, GlassBadge, GlassInput (z-20)
[Layer 3: Interactive Glass Cards]     --> GlassCard, GlassKPICard (z-10)
[Layer 2: Structural Glass Panels]     --> .glass-panel content containers (z-0)
[Layer 1: Refractive Micro-Grid]       --> Optical dot/mesh mask (pointer-events-none)
[Layer 0: Ambient Fluid Mesh Underlay] --> LiquidBackground drifting orbs (fixed -z-10)
```

### Layer 0: Ambient Liquid Mesh Underlay (`LiquidBackground.tsx`)
Because frosted glass relies on light behind it to refract, the base canvas features three slowly drifting ambient radial gradient orbs:
- **Cyan / Sky Orb (`#38bdf8`)**: Top-left ambient field.
- **Deep Indigo / Violet Orb (`#6366f1`)**: Right-center ambient field.
- **Neon Emerald Orb (`#10b981`)**: Bottom-left ambient field (symbolizing inventory health).
- **Refractive Micro-Grid**: A subtle 48px linear-gradient grid texture with radial center masking to give the eye a sense of optical depth.

### Layer 1: Structural Glass Panels (`.glass-panel`)
Used for large table wrappers, invoice form containers, and page bodies:
```css
.glass-panel {
  background-color: rgba(11, 17, 30, 0.75);
  background-image: linear-gradient(
    135deg,
    rgba(255, 255, 255, 0.05) 0%,
    rgba(255, 255, 255, 0.01) 100%
  );
  backdrop-filter: blur(20px) saturate(180%);
  -webkit-backdrop-filter: blur(20px) saturate(180%);
  border: 1px solid rgba(255, 255, 255, 0.09);
  box-shadow: 
    0 10px 30px -10px rgba(0, 0, 0, 0.6),
    inset 0 1px 1px 0 rgba(255, 255, 255, 0.15);
}
```

### Layer 2: Interactive Glass Cards (`.glass-card`)
Used for KPI metric blocks, supplier cards, report cards, and bill summaries:
- Features an inset specular gleam: `inset 0 1px 1.5px 0 rgba(255, 255, 255, 0.2)`
- Top-edge 1px gradient light catcher: `bg-gradient-to-r from-transparent via-white/30 to-transparent`
- Smooth hover elevation: `transform: translateY(-2px)` with diffused ambient cyan drop shadow.

---

## 3. CSS Architecture & Build Pipeline

### Tech Stack Integration
- **Next.js 16 (App Router)** + **React 19**
- **Tailwind CSS v4** (`@import "tailwindcss";`)
- **PostCSS Engine**: `@tailwindcss/postcss` via `postcss.config.mjs`
- **Webpack Bundler Target**: Configured in `package.json` (`next dev --webpack` and `next build --webpack`) to ensure 100% reliable child-process IPC and asset evaluation on Windows environments.

### Theme & Typography Configuration (`globals.css`)
```css
@import "tailwindcss";

:root {
  --background: #080b11;
  --foreground: #f8fafc;
  --card-bg: rgba(15, 23, 42, 0.6);
  --glass-border: rgba(255, 255, 255, 0.12);
  --glass-specular: rgba(255, 255, 255, 0.2);
}

@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --font-sans: var(--font-geist-sans);
  --font-mono: var(--font-geist-mono);
}
```

### Thermal & A4 Print Media Rule
Crucial for retail POS billing: guarantees that when counter bills are printed to 80mm/58mm thermal rolls or A4 PDFs, glass effects do not consume black ink or produce unreadable grey gradients:
```css
@media print {
  body {
    background: #ffffff !important;
    color: #000000 !important;
  }
  .glass-panel,
  .glass-card,
  .glass-input {
    background: transparent !important;
    backdrop-filter: none !important;
    -webkit-backdrop-filter: none !important;
    box-shadow: none !important;
    border: 1px solid #cbd5e1 !important;
    color: #000000 !important;
  }
}
```

---

## 4. Production-Grade Folder Structure

The frontend is strictly decoupled into modular layers to support scaling from single-store POS to multi-branch franchise ERP:

```
frontend/src/
├── app/
│   ├── favicon.ico
│   ├── globals.css                # Liquid glass design system classes & print rules
│   ├── layout.tsx                 # Root layout with Geist font variables & metadata
│   └── page.tsx                   # Main orchestrator mounting shell and domain views
├── types/
│   └── index.ts                   # Domain TypeScript models (SparePart, Mechanic, etc.)
├── data/
│   └── mock-data.ts               # Sample datasets conforming to PostgreSQL schemas
├── utils/
│   ├── cn.ts                      # Classnames combiner utility
│   └── formatters.ts              # Currency (`₹`), numbers, and locale date formatters
├── components/
│   ├── common/
│   │   └── PageHeading.tsx        # Section header with live status badges & actions
│   ├── layout/
│   │   ├── GlassSidebar.tsx       # Floating liquid dock sidebar with active neon pills
│   │   └── GlassHeader.tsx        # Sticky top bar with instant search (Ctrl+K) & quick bill
│   ├── ui/glass/                  # Atomic Liquid Glass design system primitives
│   │   ├── LiquidBackground.tsx   # Ambient animated mesh glow orbs + optical grid
│   │   ├── GlassCard.tsx          # Card container with top-edge specular highlight
│   │   ├── GlassKPICard.tsx       # Metric cards with ambient hover glow & trend pills
│   │   ├── GlassBadge.tsx         # Liquid status pills (In Stock, Low Stock, etc.)
│   │   ├── GlassButton.tsx        # Glossy primary, frosted secondary, & ghost buttons
│   │   └── GlassInput.tsx         # Frosted inputs with barcode/search icon slots
│   └── views/                     # Domain views matching requirements.md modules
│       ├── DashboardView.tsx      # Real-time KPIs, sales/purchase chart, brand pie chart
│       ├── InventoryView.tsx      # Fast filter by brand/status, rack locations, Excel import/export
│       ├── BillingView.tsx        # POS counter billing, barcode add, GST 18%, mechanic commission
│       ├── SuppliersView.tsx      # Supplier directory with contact, GSTIN, & purchase counts
│       ├── MechanicsView.tsx      # Mechanic commission ledgers & settlement actions
│       ├── ReportsView.tsx        # Exportable business reports (PDF / Excel)
│       └── SettingsView.tsx       # Shop profile, thermal printer setup, roles & database
```

---

## 5. Component Catalog & API Reference

### 5.1 `LiquidBackground`
*Path*: `src/components/ui/glass/LiquidBackground.tsx`
- **Purpose**: Creates the ambient liquid lighting under the entire application canvas.
- **Properties**: Pure visual component, `fixed inset-0 pointer-events-none -z-10`.
- **Usage**: Mounted once in the root layout or root page.

### 5.2 `GlassCard`
*Path*: `src/components/ui/glass/GlassCard.tsx`
- **Props**:
  - `glow`: `"none" | "sky" | "emerald" | "amber" | "purple"` (hover shadow accent)
  - `className`: Additional Tailwind classes
  - `children`: Content
- **Features**: Includes simulated specular edge gleam along the top border.

### 5.3 `GlassKPICard`
*Path*: `src/components/ui/glass/GlassKPICard.tsx`
- **Props**:
  - `title`: `string` (e.g. `"Today's Sales"`)
  - `value`: `string | number` (e.g. `"₹46,280"`)
  - `subtitle?`: `string`
  - `icon`: `ReactNode`
  - `trend?`: `{ value: string; isPositive: boolean }`
  - `glowColor?`: `"sky" | "emerald" | "amber" | "purple"`

### 5.4 `GlassBadge`
*Path*: `src/components/ui/glass/GlassBadge.tsx`
- **Props**:
  - `status`: `"In Stock" | "Low Stock" | "Out of Stock" | string`
- **Visuals**:
  - `In Stock`: Emerald frosted pill (`#34d399`) with subtle pulse dot.
  - `Low Stock`: Amber warning pill (`#fbbf24`) with warning glow.
  - `Out of Stock`: Rose alert pill (`#f87171`).

### 5.5 `GlassButton`
*Path*: `src/components/ui/glass/GlassButton.tsx`
- **Props**:
  - `variant`: `"primary" | "secondary" | "danger" | "ghost"`
  - `size`: `"sm" | "md" | "lg"`
  - `icon?`: `ReactNode`
- **Variants**:
  - `primary`: Linear gradient `#0284c7` to `#2563eb` with glass sheen and blue specular border.
  - `secondary`: Frosted translucent surface with white border gleam.
  - `danger`: Soft rose glass with subtle red accent.
  - `ghost`: Transparent with hover frost.

### 5.6 `GlassInput`
*Path*: `src/components/ui/glass/GlassInput.tsx`
- **Props**:
  - `icon?`: `ReactNode` (left icon slot, e.g. `<Search />` or `<Barcode />`)
  - `rightElement?`: `ReactNode` (e.g. `<kbd>Ctrl+K</kbd>`)
  - `label?`: `string`
  - `error?`: `string`
- **Features**: Frosted dark fill (`rgba(10, 15, 26, 0.75)`), inner inset shadow, and bright cyan focus glow ring.

---

## 6. Domain-Specific POS & ERP Patterns

### 6.1 Fast Counter POS & Barcode Scanner Workflow
As outlined in `requirements.md` (Section 7 & 8):
1. **Global Shortcut**: Pressing `F2` or clicking `+ New Counter Bill` switches to `BillingView`.
2. **Barcode Scan Input**: Input field auto-captures standard EAN-13/Code-128 barcode strings (e.g., `8901234001021`) or part numbers (`BRAKE-HN-102`).
3. **Automated Calculations**:
   - Subtotal = $\sum (\text{Price} \times \text{Qty}) - \text{Discount}$
   - GST (18%) = $\text{Subtotal} \times 0.18$
   - Mechanic Commission = $\text{Subtotal} \times \frac{\text{MechanicRate}}{100}$
   - Grand Total = $\text{Subtotal} + \text{GST}$
4. **Physical Printing**: Quick trigger for Thermal Receipt (F9) and A4 Invoice PDF.

### 6.2 Inventory Rack & Stock Visibility
Motorcycle shops rely on physical rack bins (e.g. `RACK-A-01`, `RACK-OIL-01`):
- Every part card and table row displays the `rackNumber` highlighted in a high-contrast cyan frosted pill (`bg-sky-500/15 text-sky-300 border-sky-400/25 font-bold`).
- Prevents counter delays when retrieving parts during peak rush hours.

---

## 7. Guidelines for Future Feature Development

When extending PartShop with new modules (e.g., Mobile QR scan, SMS invoices, Multi-store sync), developers must follow these rules:

### Rule 1: Never Nest `backdrop-filter: blur()`
Do **not** place a component with `backdrop-filter: blur()` inside another container that already has `backdrop-filter: blur()`. Double-blurring causes significant GPU compositing lag on budget POS counter PCs.
- **Correct**: Parent container has `.glass-panel` (blur), while child rows/cards use semi-transparent solid backgrounds (`bg-white/5` or `bg-slate-900/60`).

### Rule 2: Keep Typography Accessible (Contrast First)
- Never place unshadowed light-grey text directly over turbulent background gradients.
- Use `text-white` for primary values, `text-slate-300` for secondary metadata, and `text-slate-400` for tertiary labels.
- Part numbers and financial numbers must always use `font-mono` for uniform tabular alignment.

### Rule 3: The 4-Step Formula for New Glass Primitives
When creating any new custom glass component, apply this exact recipe:
1. **Base Tint**: `background-color: rgba(15, 23, 42, 0.65)` (deep dark blue-slate).
2. **Refractive Filter**: `backdrop-filter: blur(20px) saturate(180%)`.
3. **Specular Border**: `border: 1px solid rgba(255, 255, 255, 0.1)`.
4. **Top Edge Highlight**: `box-shadow: inset 0 1px 1.5px 0 rgba(255, 255, 255, 0.2), 0 20px 40px -15px rgba(0, 0, 0, 0.6)`.

### Rule 4: Color Semantics Standard
| Color | Tone | Semantic Usage |
| :--- | :--- | :--- |
| **Sky / Cyan** | `#38bdf8` | Primary actions, navigation selection, rack locations, barcode scanner |
| **Emerald** | `#34d399` | In-Stock inventory, sales revenue, cash/UPI payment status |
| **Amber** | `#fbbf24` | Low stock warning, garage khata credit, purchase orders |
| **Purple / Violet** | `#a855f7` | Mechanic partners, commission ledgers, workshop accounts |
| **Rose** | `#f87171` | Out of stock items, critical alerts, item deletion |

### Rule 5: Keep Production Builds Verified
Always ensure additions compile with:
```powershell
npm run build
```
Any component using `new Date()` or browser-only APIs must be initialized within `useEffect` or wrapped in `<Suspense>` to maintain Next.js static prerendering compatibility.
