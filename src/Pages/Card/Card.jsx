import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  CalendarRange,
  CheckCircle2,
  ChevronRight,
  CircleDollarSign,
  Clock3,
  Minus,
  Package,
  Plus,
  PlusCircle,
  ReceiptText,
  ScanLine,
  Search,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Trash2,
  UserRoundPlus,
  Users,
  Wallet,
  X,
} from "lucide-react";
import { cn } from "../../lib/utils";
import { apiGet, apiPost, formatCurrency } from "../../lib/api";
import { buildDateRangeQuery, getDateRangePreset } from "../../lib/dateRange";
import {
  createSaleMemoItems,
  formatMemoAmount,
  printMemoSheet,
} from "../../lib/memo";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../components/ui/dialog";

const PERIOD_OPTIONS = [
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
  { value: "yearly", label: "Yearly" },
  { value: "custom", label: "Custom Range" },
  { value: "all", label: "All Time" },
];

const glassPanelClass =
  "relative overflow-hidden rounded-[28px] border border-white/70 bg-white/78 shadow-[0_28px_70px_rgba(15,23,42,0.10)] backdrop-blur-xl dark:border-white/10 dark:bg-slate-950/65 dark:shadow-[0_28px_70px_rgba(2,6,23,0.44)]";
const insetPanelClass =
  "rounded-[24px] border border-white/70 bg-white/74 shadow-[0_16px_40px_rgba(15,23,42,0.08)] backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/72 dark:shadow-[0_16px_40px_rgba(2,6,23,0.35)]";
const inputBaseClass =
  "mt-3 h-12 w-full rounded-[18px] border border-slate-200/80 bg-white/88 px-4 text-sm text-slate-900 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)] outline-none placeholder:text-slate-400 focus:border-primary/40 focus:ring-4 focus:ring-primary/15 dark:border-slate-700/70 dark:bg-slate-950/70 dark:text-slate-100 dark:placeholder:text-slate-500";
const textareaBaseClass =
  "mt-3 w-full rounded-[18px] border border-slate-200/80 bg-white/88 px-4 py-3 text-sm text-slate-900 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)] outline-none placeholder:text-slate-400 focus:border-primary/40 focus:ring-4 focus:ring-primary/15 dark:border-slate-700/70 dark:bg-slate-950/70 dark:text-slate-100 dark:placeholder:text-slate-500";
const primaryButtonClass =
  "inline-flex items-center justify-center gap-2 rounded-[18px] bg-[linear-gradient(135deg,rgba(37,99,235,1),rgba(29,78,216,0.92))] px-4 py-3 text-sm font-semibold text-white shadow-[0_20px_40px_rgba(37,99,235,0.28)] outline-none transition hover:-translate-y-0.5 hover:shadow-[0_24px_48px_rgba(37,99,235,0.34)] focus:ring-4 focus:ring-primary/20 disabled:pointer-events-none disabled:translate-y-0 disabled:opacity-60";
const secondaryButtonClass =
  "inline-flex items-center justify-center gap-2 rounded-[18px] border border-slate-200/80 bg-white/88 px-4 py-3 text-sm font-medium text-slate-700 shadow-[0_10px_28px_rgba(15,23,42,0.06)] outline-none transition hover:bg-white focus:ring-4 focus:ring-primary/15 dark:border-white/10 dark:bg-slate-950/75 dark:text-slate-200";
const microButtonClass =
  "inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200/80 bg-white/90 text-slate-600 shadow-[0_8px_18px_rgba(15,23,42,0.06)] outline-none transition hover:border-primary/30 hover:text-primary focus:ring-4 focus:ring-primary/15 disabled:pointer-events-none disabled:opacity-45 dark:border-white/10 dark:bg-slate-950/75 dark:text-slate-300";
const CART_SALE_SOURCE_LABELS = new Set(["cart", "card", "cart-sale", "pos", "checkout"]);

function formatSaleSourceLabel(value) {
  const normalized = String(value || "cart").trim().toLowerCase();
  if (!normalized || CART_SALE_SOURCE_LABELS.has(normalized)) {
    return "Cart";
  }

  return normalized
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function HeroStatCard({ icon: Icon, label, value, hint }) {
  return (
    <article className={cn(glassPanelClass, "p-5")}>
      <div className="absolute inset-x-0 top-0 h-20 bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.14),transparent_70%)]" />
      <div className="relative flex items-start justify-between gap-4">
        <div className="space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-slate-500 dark:text-slate-400">
            {label}
          </p>
          <p className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-50">{value}</p>
          <p className="text-sm leading-6 text-slate-500 dark:text-slate-400">{hint}</p>
        </div>
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[18px] border border-white/70 bg-white/80 text-primary shadow-[0_12px_26px_rgba(37,99,235,0.16)] dark:border-white/10 dark:bg-white/5">
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </article>
  );
}

function WorkspaceSection({ icon: Icon, eyebrow, title, description, action, children, className }) {
  return (
    <section className={cn(glassPanelClass, className)}>
      <div className="flex flex-col gap-4 border-b border-slate-200/70 px-5 py-5 dark:border-white/10 sm:flex-row sm:items-start sm:justify-between sm:px-6">
        <div className="flex items-start gap-4">
          {Icon ? (
            <div className="hidden h-12 w-12 shrink-0 items-center justify-center rounded-[18px] border border-white/70 bg-white/84 text-primary shadow-[0_12px_28px_rgba(37,99,235,0.12)] dark:border-white/10 dark:bg-white/5 sm:flex">
              <Icon className="h-5 w-5" />
            </div>
          ) : null}
          <div className="space-y-2">
            {eyebrow ? (
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">
                {eyebrow}
              </p>
            ) : null}
            <div className="space-y-1">
              <h2 className="text-lg font-semibold tracking-tight text-slate-900 dark:text-slate-50">{title}</h2>
              {description ? (
                <p className="max-w-3xl text-sm leading-6 text-slate-500 dark:text-slate-400">{description}</p>
              ) : null}
            </div>
          </div>
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
      <div className="p-5 sm:p-6">{children}</div>
    </section>
  );
}

function CartSummaryRow({ label, value, strong = false, accent = false }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span
        className={cn(
          "text-sm text-slate-500 dark:text-slate-400",
          strong && "font-medium text-slate-700 dark:text-slate-200"
        )}
      >
        {label}
      </span>
      <span
        className={cn(
          "text-sm font-semibold text-slate-900 dark:text-slate-50",
          accent && "text-amber-600 dark:text-amber-300"
        )}
      >
        {value}
      </span>
    </div>
  );
}

function ProductCardItem({ product, onAdd }) {
  const stock = Number(product.stock || 0);
  const isOutOfStock = stock <= 0;

  return (
    <button
      type="button"
      onClick={() => onAdd(product)}
      disabled={isOutOfStock}
      className={cn(
        insetPanelClass,
        "group flex h-full flex-col p-3 text-left outline-none transition hover:-translate-y-1 hover:border-primary/30 hover:shadow-[0_22px_46px_rgba(37,99,235,0.14)] focus:ring-4 focus:ring-primary/15 disabled:cursor-not-allowed disabled:opacity-70"
      )}
    >
      <div className="relative overflow-hidden rounded-[22px] border border-slate-200/70 bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.14),transparent_68%),linear-gradient(135deg,rgba(255,255,255,0.78),rgba(241,245,249,0.9))] dark:border-white/10 dark:bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.2),transparent_68%),linear-gradient(135deg,rgba(15,23,42,0.75),rgba(15,23,42,0.92))]">
        <div className="flex aspect-[4/3] items-center justify-center overflow-hidden">
          {product.image_url ? (
            <img
              src={product.image_url}
              alt={product.name}
              className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
            />
          ) : (
            <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-slate-400 dark:text-slate-500">
              <Package className="h-8 w-8" />
              <span className="text-xs font-medium">No image</span>
            </div>
          )}
        </div>
        <span
          className={cn(
            "absolute left-3 top-3 inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold shadow-sm",
            isOutOfStock
              ? "border-rose-200 bg-rose-50 text-rose-600 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-200"
              : "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200"
          )}
        >
          {isOutOfStock ? "Out of stock" : `${stock} in stock`}
        </span>
      </div>

      <div className="mt-4 flex flex-1 flex-col">
        <div className="space-y-2">
          <div className="flex items-start justify-between gap-3">
            <h3 className="line-clamp-2 text-sm font-semibold leading-6 text-slate-900 dark:text-slate-50">
              {product.name}
            </h3>
            <span className="shrink-0 rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-500 dark:bg-white/8 dark:text-slate-300">
              #{product.barcode || product.id}
            </span>
          </div>
          <p className="line-clamp-3 text-sm leading-6 text-slate-500 dark:text-slate-400">
            {product.description || "No description available for this item."}
          </p>
        </div>

        <div className="mt-auto flex items-end justify-between gap-3 pt-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">
              Unit price
            </p>
            <p className="mt-1 text-lg font-semibold text-slate-900 dark:text-slate-50">
              {formatCurrency(product.price)}
            </p>
          </div>
          <span
            className={cn(
              "inline-flex items-center gap-2 rounded-full px-3 py-2 text-xs font-semibold transition",
              isOutOfStock
                ? "bg-slate-100 text-slate-400 dark:bg-white/8 dark:text-slate-500"
                : "bg-primary/10 text-primary group-hover:bg-primary group-hover:text-white"
            )}
          >
            Add item
            <ChevronRight className="h-3.5 w-3.5" />
          </span>
        </div>
      </div>
    </button>
  );
}

function CartTriggerBar({ cartCount, totalAmount, dueAmount, customerName, onOpen }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className={cn(
        glassPanelClass,
        "sticky top-24 z-10 flex w-full flex-col items-start gap-4 p-4 text-left outline-none focus:ring-4 focus:ring-primary/20 sm:flex-row sm:items-center sm:justify-between xl:hidden"
      )}
      aria-label="Open cart details"
    >
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[18px] border border-white/70 bg-[linear-gradient(135deg,rgba(37,99,235,0.14),rgba(37,99,235,0.02))] text-primary shadow-[0_14px_34px_rgba(37,99,235,0.16)] dark:border-white/10 dark:bg-primary/10">
          <ShoppingBag className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">
            Cart Details
          </p>
          <p className="hidden truncate text-sm font-semibold text-slate-900 dark:text-slate-50">
            {cartCount} item{cartCount === 1 ? "" : "s"} · {customerName}
          </p>
          <p className="truncate text-sm font-semibold text-slate-900 dark:text-slate-50">
            {cartCount} item{cartCount === 1 ? "" : "s"} - {customerName}
          </p>
          <p className="truncate text-xs text-slate-500 dark:text-slate-400">Tap to review customer, items, and payment</p>
        </div>
      </div>
      <div className="w-full shrink-0 text-left sm:w-auto sm:text-right">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">
          Total
        </p>
        <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-slate-50">{formatCurrency(totalAmount)}</p>
        <p className="text-xs font-medium text-amber-600 dark:text-amber-300">Due {formatCurrency(dueAmount)}</p>
      </div>
    </button>
  );
}

function CartDetailsPanel({
  titleId,
  customerId,
  customers,
  discountAmount,
  onDiscountChange,
  showNewCustomer,
  onToggleNewCustomer,
  newCustomer,
  onNewCustomerChange,
  onAddCustomer,
  addingCustomer,
  customerError,
  cartRows,
  isInstallment,
  onInstallmentChange,
  depositAmount,
  installmentProfitPercent,
  dueInput,
  paidAmount,
  onDepositChange,
  onDepositBlur,
  onInstallmentProfitChange,
  onInstallmentDueChange,
  onDueBlur,
  onPaidChange,
  onPaidBlur,
  onPaidDueChange,
  subTotalAmount,
  discountValue,
  totalAmount,
  installmentProfitValue,
  installmentPayableTotal,
  paidValue,
  displayDueAmount,
  onCustomerChange,
  onDecreaseQuantity,
  onIncreaseQuantity,
  onChangeQuantity,
  onRemoveFromCart,
  onClear,
  onComplete,
  submitting,
  submitError,
  cartCount,
  customerName,
  onClose,
}) {
  return (
    <section className={cn(glassPanelClass, "flex h-full min-h-0 flex-col")}>
      <div className="absolute inset-x-0 top-0 h-28 bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.18),transparent_72%)]" />

      <header className="relative shrink-0 border-b border-slate-200/70 px-5 py-5 dark:border-white/10">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">
              Live checkout
            </p>
            <h2
              id={titleId}
              className="mt-2 text-xl font-semibold tracking-tight text-slate-900 dark:text-slate-50"
            >
              Cart Details
            </h2>
            <p className="hidden mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
              {customerName} · {cartCount} item{cartCount === 1 ? "" : "s"} in this sale
            </p>
            <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
              {customerName} - {cartCount} item{cartCount === 1 ? "" : "s"} in this sale
            </p>
            {onClose ? (
              <p className="sr-only">
                Review customer, cart items, totals, and payment details before completing the sale.
              </p>
            ) : null}
          </div>

          <div className="flex items-center gap-2">
            <div className="inline-flex items-center rounded-full border border-primary/15 bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary">
              {cartCount} item{cartCount === 1 ? "" : "s"}
            </div>
            {onClose ? (
              <button
                type="button"
                onClick={onClose}
                className={microButtonClass}
                aria-label="Close cart details"
              >
                <X className="h-4 w-4" />
              </button>
            ) : null}
          </div>
        </div>
      </header>

      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-5">
        <section className={cn(insetPanelClass, "p-4")}>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-[16px] bg-primary/10 text-primary">
              <Users className="h-4 w-4" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-50">Customer & pricing</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">Assign the sale and control discounts before payment</p>
            </div>
          </div>

          <label className="mt-4 block">
            <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">
              Customer
            </span>
            <select
              value={customerId}
              onChange={(event) => onCustomerChange(event.target.value)}
              className={inputBaseClass}
            >
              <option value="">Walk-in customer</option>
              {customers.map((customer) => (
                <option key={customer.id} value={customer.id}>
                  {customer.name}
                </option>
              ))}
            </select>
          </label>

          <label className="mt-4 block">
            <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">
              Discount amount
            </span>
            <input
              type="number"
              min="0"
              step="0.01"
              value={discountAmount}
              onChange={(event) => onDiscountChange(event.target.value)}
              className={inputBaseClass}
              placeholder="0.00"
            />
          </label>

          <div className="mt-4">
            <button
              type="button"
              onClick={onToggleNewCustomer}
              className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-2 text-xs font-semibold text-primary outline-none transition hover:bg-primary/15 focus:ring-4 focus:ring-primary/15"
              aria-expanded={showNewCustomer}
            >
              <UserRoundPlus className="h-3.5 w-3.5" />
              {showNewCustomer ? "Hide new customer form" : "Add new customer"}
            </button>
          </div>

          {showNewCustomer ? (
            <div className="mt-4 rounded-[20px] border border-slate-200/70 bg-white/70 p-4 dark:border-white/10 dark:bg-slate-950/45">
              <label className="block">
                <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">
                  Customer name
                </span>
                <input
                  name="name"
                  value={newCustomer.name}
                  onChange={onNewCustomerChange}
                  className={inputBaseClass}
                  placeholder="Customer name"
                />
              </label>

              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">
                    Phone
                  </span>
                  <input
                    name="phone"
                    value={newCustomer.phone}
                    onChange={onNewCustomerChange}
                    className={inputBaseClass}
                    placeholder="Phone"
                  />
                </label>

                <label className="block">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">
                    Address
                  </span>
                  <input
                    name="address"
                    value={newCustomer.address}
                    onChange={onNewCustomerChange}
                    className={inputBaseClass}
                    placeholder="Address"
                  />
                </label>
              </div>

              {customerError ? <p className="mt-3 text-sm text-rose-600 dark:text-rose-300">{customerError}</p> : null}

              <div className="mt-4">
                <button
                  type="button"
                  onClick={onAddCustomer}
                  disabled={addingCustomer}
                  className={secondaryButtonClass}
                >
                  {addingCustomer ? "Adding customer..." : "Save customer"}
                </button>
              </div>
            </div>
          ) : null}
        </section>

        <section className={cn(insetPanelClass, "p-4")}>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-[16px] bg-primary/10 text-primary">
              <ShoppingBag className="h-4 w-4" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-50">Cart items</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">Adjust quantities without leaving the page</p>
            </div>
          </div>

          <div className="mt-4 space-y-3">
            {cartRows.length ? (
              cartRows.map((row) => {
                const stock = Number(row.product.stock || 0);

                return (
                  <article
                    key={row.product_id}
                    className="rounded-[20px] border border-slate-200/70 bg-white/72 p-3 dark:border-white/10 dark:bg-slate-950/45"
                  >
                    <div className="flex gap-3">
                      {row.product.image_url ? (
                        <img
                          src={row.product.image_url}
                          alt={row.product.name}
                          className="h-16 w-16 shrink-0 rounded-[16px] border border-slate-200/70 object-cover dark:border-white/10"
                        />
                      ) : (
                        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-[16px] border border-dashed border-slate-300 text-slate-400 dark:border-white/10 dark:text-slate-500">
                          <Package className="h-5 w-5" />
                        </div>
                      )}

                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-slate-900 dark:text-slate-50">
                              {row.product.name}
                            </p>
                            <p className="hidden text-xs text-slate-500 dark:text-slate-400">
                              {formatCurrency(row.unitPrice)} each · {stock} available
                            </p>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                              {formatCurrency(row.unitPrice)} each - {stock} available
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => onRemoveFromCart(row.product_id)}
                            className={microButtonClass}
                            aria-label={`Remove ${row.product.name} from cart`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>

                        <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                          <div className="inline-flex items-center rounded-full border border-slate-200/80 bg-white/90 p-1 shadow-[0_10px_24px_rgba(15,23,42,0.06)] dark:border-white/10 dark:bg-slate-950/75">
                            <button
                              type="button"
                              onClick={() => onDecreaseQuantity(row.product_id)}
                              className={microButtonClass}
                              aria-label={`Decrease ${row.product.name} quantity`}
                            >
                              <Minus className="h-3.5 w-3.5" />
                            </button>

                            <input
                              type="number"
                              min="1"
                              max={stock}
                              value={row.quantity}
                              onChange={(event) => onChangeQuantity(row.product_id, event.target.value)}
                              className="h-9 w-14 bg-transparent text-center text-sm font-semibold text-slate-900 outline-none dark:text-slate-50"
                              aria-label={`${row.product.name} quantity`}
                            />

                            <button
                              type="button"
                              onClick={() => onIncreaseQuantity(row.product_id)}
                              disabled={Number(row.quantity) >= stock}
                              className={microButtonClass}
                              aria-label={`Increase ${row.product.name} quantity`}
                            >
                              <Plus className="h-3.5 w-3.5" />
                            </button>
                          </div>

                          <div className="text-right">
                            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">
                              Line total
                            </p>
                            <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-slate-50">
                              {formatCurrency(row.total)}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </article>
                );
              })
            ) : (
              <div className="rounded-[20px] border border-dashed border-slate-300/80 bg-slate-50/70 p-6 text-center dark:border-white/10 dark:bg-slate-950/35">
                <ShoppingBag className="mx-auto h-8 w-8 text-slate-400 dark:text-slate-500" />
                <p className="mt-3 text-sm font-medium text-slate-700 dark:text-slate-200">No items in the cart yet</p>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  Tap any product card to start building the invoice.
                </p>
              </div>
            )}
          </div>
        </section>

        <section className={cn(insetPanelClass, "p-4")}>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-[16px] bg-primary/10 text-primary">
              <Wallet className="h-4 w-4" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-50">Payment details</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Toggle installments only after selecting a customer
              </p>
            </div>
          </div>

          <label className="mt-4 flex items-center justify-between gap-3 rounded-[18px] border border-slate-200/70 bg-white/78 px-4 py-3 dark:border-white/10 dark:bg-slate-950/45">
            <div>
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-50">Installment sale</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">Enable due scheduling for a selected customer</p>
            </div>
            <div className="relative">
              <input
                type="checkbox"
                checked={isInstallment}
                disabled={!customerId}
                onChange={(event) => onInstallmentChange(event.target.checked)}
                className="peer sr-only"
              />
              <div className="h-7 w-12 rounded-full bg-slate-200 transition peer-checked:bg-primary peer-disabled:opacity-50 dark:bg-slate-700" />
              <div className="absolute left-1 top-1 h-5 w-5 rounded-full bg-white shadow-sm transition peer-checked:translate-x-5" />
            </div>
          </label>

          {isInstallment ? (
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">
                  Deposit amount
                </span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={depositAmount}
                  onChange={(event) => onDepositChange(event.target.value)}
                  onBlur={onDepositBlur}
                  className={inputBaseClass}
                  placeholder="Deposit"
                />
              </label>

              <label className="block">
                <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">
                  Installment profit %
                </span>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  value={installmentProfitPercent}
                  onChange={(event) => onInstallmentProfitChange(event.target.value)}
                  className={inputBaseClass}
                  placeholder="Profit %"
                />
              </label>

              <label className="block sm:col-span-2">
                <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">
                  Due amount
                </span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={dueInput}
                  disabled={!customerId}
                  onChange={(event) => onInstallmentDueChange(event.target.value)}
                  onBlur={onDueBlur}
                  className={inputBaseClass}
                  placeholder="Due"
                />
              </label>
            </div>
          ) : (
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">
                  Paid amount
                </span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={paidAmount}
                  onChange={(event) => onPaidChange(event.target.value)}
                  onBlur={onPaidBlur}
                  className={inputBaseClass}
                  placeholder="Amount paid now"
                />
              </label>

              <label className="block">
                <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">
                  Due amount
                </span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={dueInput}
                  disabled={!customerId}
                  onChange={(event) => onPaidDueChange(event.target.value)}
                  onBlur={onDueBlur}
                  className={inputBaseClass}
                  placeholder="Amount due later"
                />
              </label>
            </div>
          )}
        </section>
      </div>

      <footer className="shrink-0 border-t border-slate-200/70 px-5 py-5 dark:border-white/10">
        <div className="rounded-[22px] border border-slate-200/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.88),rgba(248,250,252,0.96))] p-4 dark:border-white/10 dark:bg-[linear-gradient(180deg,rgba(15,23,42,0.88),rgba(2,6,23,0.96))]">
          <div className="space-y-2">
            <CartSummaryRow label="Subtotal" value={formatCurrency(subTotalAmount)} />
            <CartSummaryRow label="Discount" value={formatCurrency(discountValue)} />
            <CartSummaryRow label="Total" value={formatCurrency(totalAmount)} strong />
            {isInstallment ? (
              <>
                <CartSummaryRow label="Installment profit" value={formatCurrency(installmentProfitValue)} />
                <CartSummaryRow label="Installment payable" value={formatCurrency(installmentPayableTotal)} strong />
              </>
            ) : null}
            <CartSummaryRow label="Paid" value={formatCurrency(paidValue)} />
            <div className="my-2 border-t border-dashed border-slate-200 dark:border-white/10" />
            <CartSummaryRow label="Due" value={formatCurrency(displayDueAmount)} strong accent />
          </div>
        </div>

        {submitError ? <p className="mt-3 text-sm text-rose-600 dark:text-rose-300">{submitError}</p> : null}

        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <button type="button" onClick={onClear} className={secondaryButtonClass}>
            Clear
          </button>
          <button
            type="button"
            onClick={onComplete}
            disabled={submitting || !cartRows.length}
            className={primaryButtonClass}
          >
            {submitting ? "Saving..." : "Complete Sale"}
          </button>
        </div>
      </footer>
    </section>
  );
}

function CardSale() {
  const [products, setProducts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [salesError, setSalesError] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [search, setSearch] = useState("");
  const [barcode, setBarcode] = useState("");
  const [customerId, setCustomerId] = useState("");
  const [discountAmount, setDiscountAmount] = useState("");
  const [cart, setCart] = useState([]);
  const [showNewCustomer, setShowNewCustomer] = useState(false);
  const [addingCustomer, setAddingCustomer] = useState(false);
  const [customerError, setCustomerError] = useState("");
  const [newCustomer, setNewCustomer] = useState({
    name: "",
    phone: "",
    address: "",
  });

  const [isInstallment, setIsInstallment] = useState(false);
  const [depositAmount, setDepositAmount] = useState("");
  const [installmentProfitPercent, setInstallmentProfitPercent] = useState("");
  const [paidAmount, setPaidAmount] = useState("");
  const [dueInput, setDueInput] = useState("0");
  const [period, setPeriod] = useState("daily");
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");
  const [salesList, setSalesList] = useState([]);
  const [periodSales, setPeriodSales] = useState({ total: 0, paid: 0, due: 0, count: 0 });
  const [salesLoading, setSalesLoading] = useState(true);
  const [mobileCartOpen, setMobileCartOpen] = useState(false);
  const [dueOpen, setDueOpen] = useState(false);
  const [dueSubmitting, setDueSubmitting] = useState(false);
  const [dueError, setDueError] = useState("");
  const [dueForm, setDueForm] = useState({
    sale_id: "",
    customer_id: "",
    customer_name: "",
    sale_due: "",
    amount: "",
    note: "",
  });

  const barcodeRef = useRef(null);
  const depositAmountRef = useRef("");
  const mobileCartDialogRef = useRef(null);
  depositAmountRef.current = depositAmount;

  const rangeQuery = useMemo(
    () => buildDateRangeQuery(period, customStartDate, customEndDate),
    [period, customStartDate, customEndDate]
  );

  useEffect(() => {
    let active = true;

    const loadData = async () => {
      try {
        setLoading(true);
        const [productPayload, customerPayload] = await Promise.all([
          apiGet("/api/products"),
          apiGet("/api/customers"),
        ]);

        if (active) {
          setProducts(productPayload || []);
          setCustomers(customerPayload || []);
          setError("");
        }
      } catch (err) {
        if (active) {
          setError(err.message || "Failed to load cart sale data");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    loadData();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      barcodeRef.current?.focus();
    }, 100);

    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (period === "custom") return;

    const preset = getDateRangePreset(period);
    setCustomStartDate(preset.startDate);
    setCustomEndDate(preset.endDate);
  }, [period]);

  const loadPeriodSales = useCallback(async () => {
    try {
      setSalesLoading(true);
      setSalesError("");

      const params = new URLSearchParams();
      if (rangeQuery.start_date) params.set("start_date", rangeQuery.start_date);
      if (rangeQuery.end_date) params.set("end_date", rangeQuery.end_date);

      const sales = await apiGet(`/api/sales${params.toString() ? `?${params.toString()}` : ""}`);
      setSalesList(sales || []);

      const total = (sales || []).reduce((sum, sale) => sum + Number(sale.total_amount || 0), 0);
      const paid = (sales || []).reduce((sum, sale) => sum + Number(sale.paid_amount || 0), 0);
      const due = (sales || []).reduce((sum, sale) => sum + Number(sale.due_amount || 0), 0);

      setPeriodSales({ total, paid, due, count: (sales || []).length });
    } catch (err) {
      setSalesError(err.message || "Failed to load sales summary.");
    } finally {
      setSalesLoading(false);
    }
  }, [rangeQuery.end_date, rangeQuery.start_date]);

  useEffect(() => {
    loadPeriodSales();
  }, [loadPeriodSales]);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(min-width: 1280px)");
    const handleChange = (event) => {
      if (event.matches) {
        setMobileCartOpen(false);
      }
    };

    handleChange(mediaQuery);
    mediaQuery.addEventListener("change", handleChange);

    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  useEffect(() => {
    if (!mobileCartOpen) return undefined;

    const previousOverflow = document.body.style.overflow;
    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        setMobileCartOpen(false);
      }
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    const frameId = window.requestAnimationFrame(() => {
      mobileCartDialogRef.current?.focus();
    });

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
      window.cancelAnimationFrame(frameId);
    };
  }, [mobileCartOpen]);

  const openDueDialog = (sale) => {
    setDueError("");
    setSalesError("");

    const linkedCustomerId = Number(sale.customer_id || 0);
    if (!linkedCustomerId) {
      setSalesError("This invoice has no customer linked to it, so due payment cannot be recorded.");
      return;
    }

    const saleDue = Number(sale.due_amount || 0);
    setDueForm({
      sale_id: String(sale.id),
      customer_id: String(linkedCustomerId),
      customer_name: sale.customer_name || "Customer",
      sale_due: String(saleDue.toFixed(2)),
      amount: String(saleDue.toFixed(2)),
      note: `Due payment for ${sale.invoice_no}`,
    });
    setDueOpen(true);
  };

  const handleDueFormChange = (event) => {
    const { name, value } = event.target;
    setDueForm((prev) => ({ ...prev, [name]: value }));
  };

  const submitDuePayment = async (event) => {
    event.preventDefault();
    setDueError("");

    const linkedCustomerId = Number(dueForm.customer_id);
    if (!linkedCustomerId || Number.isNaN(linkedCustomerId)) {
      setDueError("Select a valid customer for this due payment.");
      return;
    }

    const maxSaleDue = Number(dueForm.sale_due || 0);
    const amount = Number(dueForm.amount || 0);
    if (Number.isNaN(amount) || amount <= 0) {
      setDueError("Enter a valid due amount.");
      return;
    }

    if (amount > maxSaleDue) {
      setDueError("Due payment cannot be greater than remaining sale due.");
      return;
    }

    try {
      setDueSubmitting(true);
      await apiPost("/api/payments", {
        customer_id: linkedCustomerId,
        sale_id: Number(dueForm.sale_id),
        amount,
        note: dueForm.note.trim() || null,
      });

      await loadPeriodSales();
      setDueOpen(false);
    } catch (err) {
      setDueError(err.message || "Failed to record due payment");
    } finally {
      setDueSubmitting(false);
    }
  };

  const rangeLabel = useMemo(() => {
    if (period === "all") return "All Time";
    if (period === "custom") {
      if (customStartDate && customEndDate) {
        return `${customStartDate} to ${customEndDate}`;
      }
      return "Custom Range";
    }

    return period.charAt(0).toUpperCase() + period.slice(1);
  }, [period, customStartDate, customEndDate]);

  const filteredProducts = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) return products;

    return products.filter((product) => {
      const name = String(product.name || "").toLowerCase();
      const barcodeValue = String(product.barcode || "").toLowerCase();
      const description = String(product.description || "").toLowerCase();
      return name.includes(needle) || barcodeValue.includes(needle) || description.includes(needle);
    });
  }, [products, search]);

  const cartRows = useMemo(() => {
    return cart
      .map((entry) => {
        const product = products.find((item) => Number(item.id) === Number(entry.product_id));
        if (!product) return null;

        const quantity = Number(entry.quantity || 0);
        const unitPrice = Number(product.price || 0);

        return {
          ...entry,
          product,
          quantity,
          unitPrice,
          total: quantity * unitPrice,
        };
      })
      .filter(Boolean);
  }, [cart, products]);

  const subTotalAmount = useMemo(
    () => cartRows.reduce((sum, row) => sum + Number(row.total || 0), 0),
    [cartRows]
  );

  const discountValue = useMemo(() => {
    const parsed = Number(discountAmount || 0);
    if (Number.isNaN(parsed)) return 0;
    return Math.min(Math.max(parsed, 0), subTotalAmount);
  }, [discountAmount, subTotalAmount]);

  const totalAmount = useMemo(() => Math.max(subTotalAmount - discountValue, 0), [subTotalAmount, discountValue]);

  const paidValue = useMemo(() => {
    if (isInstallment) {
      const parsed = Number(depositAmount || 0);
      return Number.isNaN(parsed) ? 0 : parsed;
    }

    const parsed = Number(paidAmount || 0);
    return Number.isNaN(parsed) ? 0 : parsed;
  }, [depositAmount, isInstallment, paidAmount]);

  const dueAmount = useMemo(() => Math.max(totalAmount - paidValue, 0), [totalAmount, paidValue]);

  const installmentProfitValue = useMemo(() => {
    const parsed = Number(installmentProfitPercent || 0);
    if (Number.isNaN(parsed)) return 0;
    const safePercent = Math.min(Math.max(parsed, 0), 100);
    return (totalAmount * safePercent) / 100;
  }, [installmentProfitPercent, totalAmount]);

  const installmentPayableTotal = useMemo(
    () => totalAmount + installmentProfitValue,
    [installmentProfitValue, totalAmount]
  );

  const installmentDueAmount = useMemo(
    () => Math.max(installmentPayableTotal - paidValue, 0),
    [installmentPayableTotal, paidValue]
  );

  const displayDueAmount = useMemo(
    () => (isInstallment ? installmentDueAmount : dueAmount),
    [dueAmount, installmentDueAmount, isInstallment]
  );

  const selectedCustomerName = useMemo(() => {
    if (!customerId) return "Walk-in customer";
    return customers.find((customer) => String(customer.id) === String(customerId))?.name || "Selected customer";
  }, [customerId, customers]);

  const amountsMatch = (left, right) => Math.abs(Number(left || 0) - Number(right || 0)) < 0.0001;

  useEffect(() => {
    if (isInstallment) {
      setDepositAmount("");
      setInstallmentProfitPercent("");
      setDueInput(totalAmount > 0 ? totalAmount.toFixed(2) : "0");
      setPaidAmount("");
      return;
    }

    const totalText = totalAmount > 0 ? totalAmount.toFixed(2) : "";
    setPaidAmount(totalText);
    setDepositAmount("");
    setInstallmentProfitPercent("");
    setDueInput("0");
  }, [isInstallment, totalAmount]);

  const handleDepositChange = (value) => {
    if (value === "") {
      setDepositAmount("");
      setDueInput(installmentPayableTotal > 0 ? installmentPayableTotal.toFixed(2) : "0.00");
      return;
    }

    const deposit = Number(value || 0);
    if (Number.isNaN(deposit)) {
      setDepositAmount(value);
      return;
    }

    const safeDeposit = Math.min(Math.max(deposit, 0), totalAmount);
    const due = Math.max(installmentPayableTotal - safeDeposit, 0);
    setDepositAmount(amountsMatch(safeDeposit, deposit) ? value : safeDeposit.toFixed(2));
    setDueInput(due.toFixed(2));
  };

  const handleDueInputChangeInstallment = (value) => {
    if (value === "") {
      setDueInput("");
      setDepositAmount("");
      return;
    }

    const due = Number(value || 0);
    if (Number.isNaN(due)) {
      setDueInput(value);
      return;
    }

    const safeDue = Math.min(Math.max(due, 0), installmentPayableTotal);
    const deposit = Math.min(Math.max(installmentPayableTotal - safeDue, 0), totalAmount);
    const normalizedDue = Math.max(installmentPayableTotal - deposit, 0);
    setDueInput(amountsMatch(normalizedDue, due) ? value : normalizedDue.toFixed(2));
    setDepositAmount(deposit.toFixed(2));
  };

  useEffect(() => {
    if (!isInstallment) return;

    const deposit = Number(depositAmountRef.current || 0);
    const safeDeposit = Number.isNaN(deposit) ? 0 : Math.min(Math.max(deposit, 0), totalAmount);
    const nextDue = Math.max(installmentPayableTotal - safeDeposit, 0);
    setDueInput(nextDue.toFixed(2));
  }, [installmentPayableTotal, isInstallment, totalAmount]);

  const handlePaidChangeNonInstallment = (value) => {
    if (value === "") {
      setPaidAmount("");
      setDueInput(totalAmount > 0 ? totalAmount.toFixed(2) : "0.00");
      return;
    }

    const paid = Number(value || 0);
    if (Number.isNaN(paid)) {
      setPaidAmount(value);
      return;
    }

    const safePaid = Math.min(Math.max(paid, 0), totalAmount);
    const due = Math.max(totalAmount - safePaid, 0);
    setPaidAmount(amountsMatch(safePaid, paid) ? value : safePaid.toFixed(2));
    setDueInput(due.toFixed(2));
  };

  const handleDueInputChangeNonInstallment = (value) => {
    if (value === "") {
      setDueInput("");
      setPaidAmount("");
      return;
    }

    const due = Number(value || 0);
    if (Number.isNaN(due)) {
      setDueInput(value);
      return;
    }

    const safeDue = Math.min(Math.max(due, 0), totalAmount);
    const paid = Math.max(totalAmount - safeDue, 0);
    setDueInput(amountsMatch(safeDue, due) ? value : safeDue.toFixed(2));
    setPaidAmount(paid.toFixed(2));
  };

  const normalizeDepositInput = () => {
    setDepositAmount((paidValue || 0).toFixed(2));
  };

  const normalizePaidInput = () => {
    setPaidAmount((paidValue || 0).toFixed(2));
  };

  const normalizeDueInput = () => {
    const nextDue = isInstallment ? installmentDueAmount : dueAmount;
    setDueInput(nextDue.toFixed(2));
  };

  const addProductToCart = (product) => {
    setSubmitError("");

    const stock = Number(product.stock || 0);
    if (stock <= 0) {
      setSubmitError(`Product "${product.name}" is out of stock.`);
      return;
    }

    const currentQty = Number(
      cart.find((entry) => Number(entry.product_id) === Number(product.id))?.quantity || 0
    );

    if (currentQty >= stock) {
      setSubmitError(`Only ${stock} unit${stock === 1 ? "" : "s"} available for "${product.name}".`);
      return;
    }

    setCart((prev) => {
      const idx = prev.findIndex((entry) => Number(entry.product_id) === Number(product.id));
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = { ...next[idx], quantity: String(Number(next[idx].quantity || 0) + 1) };
        return next;
      }

      return [...prev, { product_id: String(product.id), quantity: "1" }];
    });
  };

  const changeQuantity = (productId, nextQuantity) => {
    const parsed = Number(nextQuantity || 0);
    if (Number.isNaN(parsed) || parsed < 1) {
      return;
    }

    const stock = Number(
      products.find((product) => Number(product.id) === Number(productId))?.stock || 0
    );
    const safeQuantity = stock > 0 ? Math.min(parsed, stock) : parsed;

    if (stock > 0 && parsed > stock) {
      setSubmitError(`Only ${stock} unit${stock === 1 ? "" : "s"} available for this product.`);
    }

    setCart((prev) =>
      prev.map((entry) =>
        Number(entry.product_id) === Number(productId)
          ? { ...entry, quantity: String(safeQuantity) }
          : entry
      )
    );
  };

  const increaseQuantity = (productId) => {
    const product = products.find((entry) => Number(entry.id) === Number(productId));
    const stock = Number(product?.stock || 0);
    const currentQty = Number(
      cart.find((entry) => Number(entry.product_id) === Number(productId))?.quantity || 0
    );

    if (stock > 0 && currentQty >= stock) {
      setSubmitError(`Only ${stock} unit${stock === 1 ? "" : "s"} available for "${product?.name || "this product"}".`);
      return;
    }

    setCart((prev) =>
      prev.map((entry) =>
        Number(entry.product_id) === Number(productId)
          ? { ...entry, quantity: String(Number(entry.quantity || 0) + 1) }
          : entry
      )
    );
  };

  const decreaseQuantity = (productId) => {
    setCart((prev) =>
      prev
        .map((entry) => {
          if (Number(entry.product_id) !== Number(productId)) {
            return entry;
          }

          return { ...entry, quantity: String(Number(entry.quantity || 0) - 1) };
        })
        .filter((entry) => Number(entry.quantity || 0) > 0)
    );
  };

  const removeFromCart = (productId) => {
    setCart((prev) => prev.filter((entry) => Number(entry.product_id) !== Number(productId)));
  };

  const handleBarcodeAdd = async () => {
    const code = barcode.trim();
    if (!code) return;

    try {
      setSubmitError("");
      const product = await apiGet(`/api/products/barcode/${encodeURIComponent(code)}`);
      addProductToCart(product);
      setBarcode("");
    } catch (err) {
      setSubmitError(err.message || "Barcode not found.");
    }
  };

  const handleNewCustomerChange = (event) => {
    const { name, value } = event.target;
    setCustomerError("");
    setNewCustomer((prev) => ({ ...prev, [name]: value }));
  };

  const handleAddCustomer = async () => {
    setCustomerError("");
    if (!newCustomer.name.trim()) {
      setCustomerError("Customer name is required.");
      return;
    }

    try {
      setAddingCustomer(true);
      const created = await apiPost("/api/customers", {
        name: newCustomer.name.trim(),
        phone: newCustomer.phone.trim() || null,
        address: newCustomer.address.trim() || null,
      });

      setCustomers((prev) => [created, ...prev]);
      setCustomerId(String(created.id));
      setNewCustomer({ name: "", phone: "", address: "" });
      setShowNewCustomer(false);
    } catch (err) {
      setCustomerError(err.message || "Failed to add customer.");
    } finally {
      setAddingCustomer(false);
    }
  };

  const resetCartFlow = () => {
    setCart([]);
    setCustomerId("");
    setDiscountAmount("");
    setIsInstallment(false);
    setDepositAmount("");
    setInstallmentProfitPercent("");
    setPaidAmount("");
    setDueInput("0");
    setBarcode("");
    setShowNewCustomer(false);
    setCustomerError("");
    setSubmitError("");
    barcodeRef.current?.focus();
  };

  const formatSaleDate = (value) =>
    new Date(value || Date.now()).toLocaleString([], {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  const printMemo = async ({ sale, customerName, soldItems, total, paid, due }) => {
    const customerAddress =
      customers.find((entry) => Number(entry.id) === Number(sale.customer_id))?.address || "";
    const memoNotes = [];
    if (sale.invoice_no) {
      memoNotes.push(`ইনভয়েস নং: ${sale.invoice_no}`);
    }
    memoNotes.push(
      Number(due || 0) > 0
        ? `এই মেমোতে ${formatMemoAmount(due)} টাকা বাকি রয়েছে।`
        : "এই মেমোর সব টাকা পরিশোধ করা হয়েছে।"
    );

    memoNotes.length = 0;
    if (sale.invoice_no) {
      memoNotes.push(`Invoice No: ${sale.invoice_no}`);
    }
    memoNotes.push(
      Number(due || 0) > 0
        ? `Outstanding due on this memo: ${formatMemoAmount(due)}.`
        : "This memo has been paid in full."
    );

    await printMemoSheet({
      browserTitle: `Memo ${sale.invoice_no || sale.id || ""}`,
      title: "ক্যাশ মেমো",
      memoNo: sale.id || sale.invoice_no,
      date: sale.sale_date,
      customerName,
      customerAddress,
      items: createSaleMemoItems(soldItems),
      summaryRows: [
        { label: "সর্বমোট", value: total, highlight: true },
        { label: "পরিশোধ", value: paid },
        { label: "বাকি", value: due, emphasis: Number(due || 0) > 0 },
      ],
      note: memoNotes.join("\n"),
      footerLines: ["বি: দ্রঃ বিক্রিত মাল ফেরত নেওয়া হয় না।", "সততাই উন্নয়নের প্রথম ধাপ"],
      leftSignatureLabel: "ক্রেতার স্বাক্ষর",
      rightSignatureLabel: "বিক্রেতার স্বাক্ষর",
      qrText: sale.invoice_no ? `ORDER:${sale.invoice_no}` : "",
      qrCaption: sale.invoice_no ? `ইনভয়েস: ${sale.invoice_no}` : "",
      title: "Cash Memo",
      summaryRows: [
        { label: "Total", value: total, highlight: true },
        { label: "Paid", value: paid },
        { label: "Due", value: due, emphasis: Number(due || 0) > 0 },
      ],
      footerLines: ["Note: Sold goods are not returnable.", "Thank you for your business."],
      leftSignatureLabel: "Customer Signature",
      rightSignatureLabel: "Seller Signature",
      qrCaption: sale.invoice_no ? `Invoice: ${sale.invoice_no}` : "",
    });
  };

  const handleCompleteSale = async () => {
    setSubmitError("");

    if (!cartRows.length) {
      setSubmitError("Add products to the cart first.");
      return;
    }

    const payloadItems = cartRows.map((row) => ({
      product_id: Number(row.product_id),
      quantity: Number(row.quantity),
    }));

    const outOfStock = payloadItems.find((item) => {
      const product = products.find((entry) => Number(entry.id) === Number(item.product_id));
      return !product || Number(item.quantity) > Number(product.stock || 0);
    });

    if (outOfStock) {
      setSubmitError("Some items exceed current stock.");
      return;
    }

    const paid = paidValue;
    if (Number.isNaN(paid) || paid < 0 || paid > totalAmount) {
      setSubmitError("Paid amount is invalid.");
      return;
    }

    if (!customerId && displayDueAmount > 0) {
      setSubmitError("Walk-in customer cannot keep due. Select a customer or pay the full amount.");
      return;
    }

    try {
      setSubmitting(true);
      const created = await apiPost("/api/sales", {
        customer_id: customerId ? Number(customerId) : null,
        items: payloadItems,
        discount_amount: discountValue,
        paid_amount: paid,
        sale_source: "cart",
      });

      const customerName =
        customers.find((entry) => Number(entry.id) === Number(created.customer_id))?.name || "Walk-in";

      setProducts((prev) =>
        prev.map((product) => {
          const sold = payloadItems.find((item) => Number(item.product_id) === Number(product.id));
          return sold
            ? { ...product, stock: Number(product.stock || 0) - Number(sold.quantity || 0) }
            : product;
        })
      );

      await loadPeriodSales();
      await printMemo({
        sale: created,
        customerName,
        soldItems: cartRows,
        total: totalAmount,
        paid,
        due: displayDueAmount,
      });

      resetCartFlow();
      setMobileCartOpen(false);
    } catch (err) {
      setSubmitError(err.message || "Failed to complete sale.");
    } finally {
      setSubmitting(false);
    }
  };

  const cartCount = useMemo(
    () => cartRows.reduce((sum, row) => sum + Number(row.quantity || 0), 0),
    [cartRows]
  );

  const stats = useMemo(() => {
    const inStock = products.filter((product) => Number(product.stock || 0) > 0).length;
    return [
      {
        icon: Package,
        label: "Products",
        value: String(products.length),
        hint: `${filteredProducts.length} visible in this view`,
      },
      {
        icon: ShieldCheck,
        label: "In Stock",
        value: String(inStock),
        hint: "Ready to sell right now",
      },
      {
        icon: ReceiptText,
        label: `Sales (${rangeLabel})`,
        value: String(periodSales.count),
        hint: `Total ${formatCurrency(periodSales.total)}`,
      },
      {
        icon: CircleDollarSign,
        label: "Paid / Due",
        value: formatCurrency(periodSales.paid),
        hint: `Outstanding ${formatCurrency(periodSales.due)}`,
      },
    ];
  }, [filteredProducts.length, periodSales.count, periodSales.due, periodSales.paid, periodSales.total, products, rangeLabel]);

  return (
    <>
      <section className="relative min-w-0 space-y-6">
        <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[30rem] bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.16),transparent_28%),radial-gradient(circle_at_top_right,rgba(148,163,184,0.16),transparent_30%),radial-gradient(circle_at_bottom,rgba(37,99,235,0.1),transparent_40%)]" />

        <header className={cn(glassPanelClass, "overflow-hidden px-6 py-6 sm:px-8 sm:py-8")}>
          <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.36),rgba(255,255,255,0.08))] dark:bg-[linear-gradient(135deg,rgba(30,41,59,0.32),rgba(15,23,42,0.06))]" />
          <div className="absolute -right-14 top-0 h-52 w-52 rounded-full bg-primary/10 blur-3xl" />
          <div className="absolute bottom-0 left-0 h-48 w-48 rounded-full bg-sky-200/40 blur-3xl dark:bg-primary/10" />

          <div className="relative flex flex-col gap-8 xl:flex-row xl:items-end xl:justify-between">
            <div className="max-w-3xl space-y-4">
              <span className="inline-flex items-center gap-2 rounded-full border border-primary/15 bg-primary/10 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-primary">
                <Sparkles className="h-3.5 w-3.5" />
                Premium cart POS workspace
              </span>

              <div className="space-y-3">
                <h1 className="text-3xl font-semibold tracking-tight text-slate-900 dark:text-slate-50 sm:text-4xl">
                  Cart / POS workspace built for fast counter sales.
                </h1>
                <p className="max-w-2xl text-sm leading-7 text-slate-500 dark:text-slate-400 sm:text-base">
                  Search products, scan barcodes, monitor invoice activity, and complete payment from a dense,
                  polished sales workspace with a dedicated cart rail on the side and a mobile cart dialog when you
                  need it.
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <div className="inline-flex items-center gap-2 rounded-full border border-white/70 bg-white/78 px-4 py-2 text-sm font-medium text-slate-700 shadow-[0_14px_30px_rgba(15,23,42,0.06)] dark:border-white/10 dark:bg-white/5 dark:text-slate-200">
                  <ScanLine className="h-4 w-4 text-primary" />
                  Barcode ready
                </div>
                <div className="inline-flex items-center gap-2 rounded-full border border-white/70 bg-white/78 px-4 py-2 text-sm font-medium text-slate-700 shadow-[0_14px_30px_rgba(15,23,42,0.06)] dark:border-white/10 dark:bg-white/5 dark:text-slate-200">
                  <ShieldCheck className="h-4 w-4 text-primary" />
                  Customer-safe due flow
                </div>
                <div className="inline-flex items-center gap-2 rounded-full border border-white/70 bg-white/78 px-4 py-2 text-sm font-medium text-slate-700 shadow-[0_14px_30px_rgba(15,23,42,0.06)] dark:border-white/10 dark:bg-white/5 dark:text-slate-200">
                  <Clock3 className="h-4 w-4 text-primary" />
                  Live invoice summary
                </div>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3 xl:w-[29rem] xl:grid-cols-1">
              <div className={cn(insetPanelClass, "p-4")}>
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">
                  Active range
                </p>
                <p className="mt-2 text-lg font-semibold text-slate-900 dark:text-slate-50">{rangeLabel}</p>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  {salesLoading ? "Refreshing invoice metrics..." : `${periodSales.count} invoices tracked`}
                </p>
              </div>

              <div className={cn(insetPanelClass, "p-4")}>
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">
                  Cart details
                </p>
                <p className="mt-2 text-lg font-semibold text-slate-900 dark:text-slate-50">Pinned on the side</p>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  Desktop keeps Cart Details visible. On mobile, tap the Cart Details bar to open the dialog.
                </p>
                <p className="hidden mt-1 text-sm text-slate-500 dark:text-slate-400">
                  {cartCount} item{cartCount === 1 ? "" : "s"} - Due {formatCurrency(displayDueAmount)}
                </p>
              </div>

              <div className={cn(insetPanelClass, "p-4")}>
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">
                  Selected customer
                </p>
                <p className="mt-2 text-lg font-semibold text-slate-900 dark:text-slate-50">{selectedCustomerName}</p>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  Installment {isInstallment ? "enabled" : "disabled"}
                </p>
              </div>
            </div>
          </div>
        </header>

        {(loading || salesLoading) && !error ? (
          <div className={cn(glassPanelClass, "flex items-center gap-3 px-5 py-4 text-sm text-slate-600 dark:text-slate-300")}>
            <div className="h-2.5 w-2.5 rounded-full bg-primary animate-pulse" />
            Syncing live POS data from the local API.
          </div>
        ) : null}

        {error ? (
          <div className={cn(glassPanelClass, "px-5 py-4 text-sm text-rose-600 dark:text-rose-300")}>{error}</div>
        ) : null}

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {stats.map((stat) => (
            <HeroStatCard key={stat.label} icon={stat.icon} label={stat.label} value={stat.value} hint={stat.hint} />
          ))}
        </div>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(22rem,26rem)] 2xl:grid-cols-[minmax(0,1fr)_26rem] xl:items-start">
          <div className="min-w-0">
            <div className={cn(glassPanelClass, "overflow-visible p-4 sm:p-6 xl:p-7")}>
              <div className="absolute inset-0 rounded-[28px] bg-[radial-gradient(circle_at_top_right,rgba(59,130,246,0.12),transparent_35%),radial-gradient(circle_at_bottom_left,rgba(148,163,184,0.16),transparent_28%)]" />

              <div className="relative space-y-6">
              <CartTriggerBar
                cartCount={cartCount}
                totalAmount={totalAmount}
                dueAmount={displayDueAmount}
                customerName={selectedCustomerName}
                onOpen={() => setMobileCartOpen(true)}
              />

              <div className="grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.9fr)]">
                <label className={cn(glassPanelClass, "p-4")}>
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-[18px] bg-primary/10 text-primary">
                      <Search className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-900 dark:text-slate-50">Product search</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">Search by name, barcode, or description</p>
                    </div>
                  </div>

                  <input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    className={inputBaseClass}
                    placeholder="Find filters, lights, belts, brake pads..."
                    aria-label="Search products"
                  />
                </label>

                <div className={cn(glassPanelClass, "p-4")}>
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-[18px] bg-primary/10 text-primary">
                      <ScanLine className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-900 dark:text-slate-50">Barcode input</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">Scan and press Enter, or use the add button</p>
                    </div>
                  </div>

                  <div className="mt-3 flex flex-col gap-3 sm:flex-row">
                    <input
                      ref={barcodeRef}
                      value={barcode}
                      onChange={(event) => setBarcode(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          event.preventDefault();
                          handleBarcodeAdd();
                        }
                      }}
                      className={cn(inputBaseClass, "mt-0 flex-1")}
                      placeholder="Scan barcode"
                      aria-label="Barcode input"
                    />
                    <button
                      type="button"
                      onClick={handleBarcodeAdd}
                      className={cn(primaryButtonClass, "sm:shrink-0")}
                      aria-label="Add barcode item"
                    >
                      Add
                    </button>
                  </div>
                </div>
              </div>

              <WorkspaceSection
                icon={CalendarRange}
                eyebrow="Period filter"
                title="Invoice range controls"
                description="Switch time periods quickly or define a custom window to review invoice activity for this cart workspace."
                action={
                  <div className="inline-flex items-center rounded-full border border-primary/15 bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary">
                    {rangeLabel}
                  </div>
                }
              >
                <div className="flex flex-wrap gap-2">
                  {PERIOD_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setPeriod(option.value)}
                      className={cn(
                        "inline-flex items-center rounded-full border px-4 py-2 text-sm font-medium outline-none transition focus:ring-4 focus:ring-primary/15",
                        period === option.value
                          ? "border-primary/15 bg-primary text-white shadow-[0_12px_30px_rgba(37,99,235,0.22)]"
                          : "border-slate-200/80 bg-white/82 text-slate-600 hover:border-primary/20 hover:text-primary dark:border-white/10 dark:bg-slate-950/60 dark:text-slate-300"
                      )}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>

                {period === "custom" ? (
                  <div className="mt-5 grid gap-4 md:grid-cols-2">
                    <label className="block">
                      <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">
                        Start date
                      </span>
                      <input
                        type="date"
                        value={customStartDate}
                        onChange={(event) => setCustomStartDate(event.target.value)}
                        className={inputBaseClass}
                      />
                    </label>

                    <label className="block">
                      <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">
                        End date
                      </span>
                      <input
                        type="date"
                        value={customEndDate}
                        onChange={(event) => setCustomEndDate(event.target.value)}
                        className={inputBaseClass}
                      />
                    </label>
                  </div>
                ) : null}
              </WorkspaceSection>

              <WorkspaceSection
                icon={Package}
                eyebrow="Product shelf"
                title="Browse products"
                description="Dense product cards keep scan-and-click ordering fast without sacrificing readability."
                action={
                  <div className="inline-flex items-center rounded-full border border-slate-200/80 bg-white/82 px-3 py-1.5 text-xs font-semibold text-slate-600 dark:border-white/10 dark:bg-slate-950/60 dark:text-slate-300">
                    {filteredProducts.length} result{filteredProducts.length === 1 ? "" : "s"}
                  </div>
                }
              >
                {filteredProducts.length ? (
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
                    {filteredProducts.map((product) => (
                      <ProductCardItem key={product.id} product={product} onAdd={addProductToCart} />
                    ))}
                  </div>
                ) : (
                  <div className="rounded-[24px] border border-dashed border-slate-300/80 bg-slate-50/70 p-8 text-center dark:border-white/10 dark:bg-slate-950/35">
                    <Search className="mx-auto h-8 w-8 text-slate-400 dark:text-slate-500" />
                    <p className="mt-3 text-sm font-medium text-slate-700 dark:text-slate-200">No products matched this search.</p>
                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                      Try another keyword, barcode, or clear the search field.
                    </p>
                  </div>
                )}
              </WorkspaceSection>

              <WorkspaceSection
                icon={ReceiptText}
                eyebrow="Sales ledger"
                title="Invoices and due collection"
                description="Recent cart invoices stay on the same page so you can review totals and collect pending dues without leaving checkout."
                action={
                  <div className="inline-flex items-center rounded-full border border-slate-200/80 bg-white/82 px-3 py-1.5 text-xs font-semibold text-slate-600 dark:border-white/10 dark:bg-slate-950/60 dark:text-slate-300">
                    {salesLoading ? "Refreshing" : `${salesList.length} invoice${salesList.length === 1 ? "" : "s"}`}
                  </div>
                }
              >
                {salesError ? (
                  <div className="mb-4 rounded-[20px] border border-rose-200 bg-rose-50/90 px-4 py-3 text-sm text-rose-600 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300">
                    {salesError}
                  </div>
                ) : null}

                <div className="overflow-hidden rounded-[22px] border border-slate-200/70 bg-white/70 dark:border-white/10 dark:bg-slate-950/45">
                  <div className="overflow-x-auto">
                    <table className="min-w-[760px] w-full text-sm">
                      <thead className="bg-slate-50/90 text-left dark:bg-white/5">
                        <tr className="text-slate-500 dark:text-slate-400">
                          <th className="px-4 py-3 font-semibold">Invoice</th>
                          <th className="px-4 py-3 font-semibold">Customer</th>
                          <th className="px-4 py-3 font-semibold">Date</th>
                          <th className="px-4 py-3 font-semibold">Total</th>
                          <th className="px-4 py-3 font-semibold">Paid</th>
                          <th className="px-4 py-3 font-semibold">Due</th>
                          <th className="px-4 py-3 font-semibold text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {salesList.map((sale) => (
                          <tr
                            key={sale.id}
                            className="border-t border-slate-200/70 text-slate-700 transition hover:bg-slate-50/70 dark:border-white/10 dark:text-slate-200 dark:hover:bg-white/4"
                          >
                            <td className="px-4 py-4 align-top">
                              <div>
                                <p className="font-semibold text-slate-900 dark:text-slate-50">{sale.invoice_no}</p>
                                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                                  Source {formatSaleSourceLabel(sale.sale_source)}
                                </p>
                              </div>
                            </td>
                            <td className="px-4 py-4 align-top">
                              <div>
                                <p className="font-medium text-slate-900 dark:text-slate-50">
                                  {sale.customer_name || "Walk-in"}
                                </p>
                                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                                  {sale.customer_id ? "Linked customer" : "Cash customer"}
                                </p>
                              </div>
                            </td>
                            <td className="px-4 py-4 align-top text-slate-500 dark:text-slate-400">
                              {formatSaleDate(sale.sale_date)}
                            </td>
                            <td className="px-4 py-4 align-top font-medium text-slate-900 dark:text-slate-50">
                              {formatCurrency(sale.total_amount)}
                            </td>
                            <td className="px-4 py-4 align-top text-emerald-700 dark:text-emerald-300">
                              {formatCurrency(sale.paid_amount)}
                            </td>
                            <td className="px-4 py-4 align-top text-amber-600 dark:text-amber-300">
                              {formatCurrency(sale.due_amount)}
                            </td>
                            <td className="px-4 py-4 align-top text-right">
                              <button
                                type="button"
                                onClick={() => openDueDialog(sale)}
                                disabled={Number(sale.due_amount || 0) <= 0 || !sale.customer_id}
                                className={cn(
                                  secondaryButtonClass,
                                  "h-10 px-3 py-2 text-xs disabled:pointer-events-none disabled:opacity-45"
                                )}
                              >
                                <PlusCircle className="h-3.5 w-3.5" />
                                Add due
                              </button>
                            </td>
                          </tr>
                        ))}

                        {!salesLoading && salesList.length === 0 ? (
                          <tr>
                            <td colSpan={7} className="px-4 py-8 text-center">
                              <div className="flex flex-col items-center gap-2 text-slate-500 dark:text-slate-400">
                                <ReceiptText className="h-7 w-7" />
                                <p className="font-medium text-slate-700 dark:text-slate-200">No invoices found for this range.</p>
                                <p className="text-sm">Change the period filter or complete a new sale to populate the table.</p>
                              </div>
                            </td>
                          </tr>
                        ) : null}
                      </tbody>
                    </table>
                  </div>
                </div>
              </WorkspaceSection>
              </div>
            </div>
          </div>

          <aside className="hidden min-w-0 xl:block" aria-label="Cart details">
            <div className="sticky top-24 h-[calc(100vh-7.5rem)]">
              <CartDetailsPanel
                customerId={customerId}
                customers={customers}
                discountAmount={discountAmount}
                onDiscountChange={setDiscountAmount}
                showNewCustomer={showNewCustomer}
                onToggleNewCustomer={() => {
                  setShowNewCustomer((prev) => !prev);
                  setCustomerError("");
                }}
                newCustomer={newCustomer}
                onNewCustomerChange={handleNewCustomerChange}
                onAddCustomer={handleAddCustomer}
                addingCustomer={addingCustomer}
                customerError={customerError}
                cartRows={cartRows}
                isInstallment={isInstallment}
                onInstallmentChange={setIsInstallment}
                depositAmount={depositAmount}
                installmentProfitPercent={installmentProfitPercent}
                dueInput={dueInput}
                paidAmount={paidAmount}
                onDepositChange={handleDepositChange}
                onDepositBlur={normalizeDepositInput}
                onInstallmentProfitChange={setInstallmentProfitPercent}
                onInstallmentDueChange={handleDueInputChangeInstallment}
                onDueBlur={normalizeDueInput}
                onPaidChange={handlePaidChangeNonInstallment}
                onPaidBlur={normalizePaidInput}
                onPaidDueChange={handleDueInputChangeNonInstallment}
                subTotalAmount={subTotalAmount}
                discountValue={discountValue}
                totalAmount={totalAmount}
                installmentProfitValue={installmentProfitValue}
                installmentPayableTotal={installmentPayableTotal}
                paidValue={paidValue}
                displayDueAmount={displayDueAmount}
                onCustomerChange={setCustomerId}
                onDecreaseQuantity={decreaseQuantity}
                onIncreaseQuantity={increaseQuantity}
                onChangeQuantity={changeQuantity}
                onRemoveFromCart={removeFromCart}
                onClear={resetCartFlow}
                onComplete={handleCompleteSale}
                submitting={submitting}
                submitError={submitError}
                cartCount={cartCount}
                customerName={selectedCustomerName}
              />
            </div>
          </aside>
        </div>
      </section>

      <Dialog open={dueOpen} onOpenChange={setDueOpen}>
        <DialogContent className="sm:max-w-xl rounded-[28px] border-white/70 bg-white/86 p-0 shadow-[0_28px_70px_rgba(15,23,42,0.18)] backdrop-blur-xl dark:border-white/10 dark:bg-slate-950/78">
          <div className="overflow-hidden rounded-[28px]">
            <div className="border-b border-slate-200/70 px-6 py-5 dark:border-white/10">
              <DialogHeader className="text-left">
                <DialogTitle className="text-xl font-semibold text-slate-900 dark:text-slate-50">Add Due Payment</DialogTitle>
                <DialogDescription className="text-slate-500 dark:text-slate-400">
                  Record a payment against this invoice due.
                </DialogDescription>
              </DialogHeader>
            </div>

            <form onSubmit={submitDuePayment} className="space-y-5 px-6 py-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className={cn(insetPanelClass, "p-4")}>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">
                    Customer
                  </p>
                  <p className="mt-2 text-base font-semibold text-slate-900 dark:text-slate-50">{dueForm.customer_name || "-"}</p>
                </div>
                <div className={cn(insetPanelClass, "p-4")}>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">
                    Remaining due
                  </p>
                  <p className="mt-2 text-base font-semibold text-slate-900 dark:text-slate-50">
                    {formatCurrency(dueForm.sale_due || 0)}
                  </p>
                </div>
              </div>

              <label className="block">
                <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">
                  Amount
                </span>
                <input
                  name="amount"
                  type="number"
                  min="0"
                  step="0.01"
                  value={dueForm.amount}
                  onChange={handleDueFormChange}
                  className={inputBaseClass}
                />
              </label>

              <label className="block">
                <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">
                  Note
                </span>
                <textarea
                  name="note"
                  rows={3}
                  value={dueForm.note}
                  onChange={handleDueFormChange}
                  className={textareaBaseClass}
                  placeholder="Optional note"
                />
              </label>

              {dueError ? <p className="text-sm text-rose-600 dark:text-rose-300">{dueError}</p> : null}

              <DialogFooter className="gap-3 sm:justify-end sm:space-x-0">
                <button type="button" onClick={() => setDueOpen(false)} className={secondaryButtonClass}>
                  Cancel
                </button>
                <button type="submit" disabled={dueSubmitting} className={primaryButtonClass}>
                  {dueSubmitting ? "Saving..." : "Save Due"}
                </button>
              </DialogFooter>
            </form>
          </div>
        </DialogContent>
      </Dialog>

      {mobileCartOpen ? (
        <div className="xl:hidden">
          <button
            type="button"
            onClick={() => setMobileCartOpen(false)}
            className="fixed inset-0 z-40 bg-slate-950/30 backdrop-blur-[3px]"
            aria-label="Close cart details backdrop"
          />

          <div
            ref={mobileCartDialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="mobile-cart-title"
            tabIndex={-1}
            className="fixed inset-x-3 bottom-4 top-24 z-50 outline-none sm:inset-x-6"
          >
            <CartDetailsPanel
              titleId="mobile-cart-title"
              customerId={customerId}
              customers={customers}
              discountAmount={discountAmount}
              onDiscountChange={setDiscountAmount}
              showNewCustomer={showNewCustomer}
              onToggleNewCustomer={() => {
                setShowNewCustomer((prev) => !prev);
                setCustomerError("");
              }}
              newCustomer={newCustomer}
              onNewCustomerChange={handleNewCustomerChange}
              onAddCustomer={handleAddCustomer}
              addingCustomer={addingCustomer}
              customerError={customerError}
              cartRows={cartRows}
              isInstallment={isInstallment}
              onInstallmentChange={setIsInstallment}
              depositAmount={depositAmount}
              installmentProfitPercent={installmentProfitPercent}
              dueInput={dueInput}
              paidAmount={paidAmount}
              onDepositChange={handleDepositChange}
              onDepositBlur={normalizeDepositInput}
              onInstallmentProfitChange={setInstallmentProfitPercent}
              onInstallmentDueChange={handleDueInputChangeInstallment}
              onDueBlur={normalizeDueInput}
              onPaidChange={handlePaidChangeNonInstallment}
              onPaidBlur={normalizePaidInput}
              onPaidDueChange={handleDueInputChangeNonInstallment}
              subTotalAmount={subTotalAmount}
              discountValue={discountValue}
              totalAmount={totalAmount}
              installmentProfitValue={installmentProfitValue}
              installmentPayableTotal={installmentPayableTotal}
              paidValue={paidValue}
              displayDueAmount={displayDueAmount}
              onCustomerChange={setCustomerId}
              onDecreaseQuantity={decreaseQuantity}
              onIncreaseQuantity={increaseQuantity}
              onChangeQuantity={changeQuantity}
              onRemoveFromCart={removeFromCart}
              onClear={resetCartFlow}
              onComplete={handleCompleteSale}
              submitting={submitting}
              submitError={submitError}
              cartCount={cartCount}
              customerName={selectedCustomerName}
              onClose={() => setMobileCartOpen(false)}
            />
          </div>
        </div>
      ) : null}
    </>
  );
}

export default CardSale;
