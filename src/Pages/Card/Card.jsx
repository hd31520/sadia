import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import QRCode from "qrcode";
import { PlusCircle } from "lucide-react";
import SectionPage from "../Shared/SectionPage";
import { apiGet, apiPost, formatCurrency } from "../../lib/api";
import { buildDateRangeQuery, getDateRangePreset } from "../../lib/dateRange";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../components/ui/dialog";

function CardSale() {
  const companyName = import.meta.env.VITE_COMPANY_NAME || "M/s Sadia Auto Parts";
  const companyAddress = import.meta.env.VITE_COMPANY_ADDRESS || "Kanaipur , Faridpur, Main Road";
  const companyProprietor = import.meta.env.VITE_COMPANY_PROPRIETOR || "Owner";
  const companyPhone = import.meta.env.VITE_COMPANY_PHONE || "+8801741165673";

  const [products, setProducts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
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
          setError(err.message || "Failed to load card sale data");
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
    const timer = setTimeout(() => {
      barcodeRef.current?.focus();
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (period !== "custom") {
      const preset = getDateRangePreset(period);
      setCustomStartDate(preset.startDate);
      setCustomEndDate(preset.endDate);
    }
  }, [period]);

  const loadPeriodSales = useCallback(async () => {
    try {
      setSalesLoading(true);
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
      setSubmitError(err.message || "Failed to load sales summary.");
    } finally {
      setSalesLoading(false);
    }
  }, [rangeQuery.end_date, rangeQuery.start_date]);

  useEffect(() => {
    loadPeriodSales();
  }, [loadPeriodSales]);

  const openDueDialog = (sale) => {
    setDueError("");

    const customerId = Number(sale.customer_id || 0);
    if (!customerId) {
      setDueError("This invoice has no customer. Please use a customer-linked sale.");
      return;
    }

    const saleDue = Number(sale.due_amount || 0);
    setDueForm({
      sale_id: String(sale.id),
      customer_id: String(customerId),
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

    const customerId = Number(dueForm.customer_id);
    if (!customerId || Number.isNaN(customerId)) {
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
        customer_id: customerId,
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
      const desc = String(product.description || "").toLowerCase();
      return name.includes(needle) || barcodeValue.includes(needle) || desc.includes(needle);
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
    } else {
      const parsed = Number(paidAmount || 0);
      return Number.isNaN(parsed) ? 0 : parsed;
    }
  }, [isInstallment, depositAmount, paidAmount]);

  const dueAmount = useMemo(() => Math.max(totalAmount - paidValue, 0), [totalAmount, paidValue]);

  const installmentProfitValue = useMemo(() => {
    const parsed = Number(installmentProfitPercent || 0);
    if (Number.isNaN(parsed)) return 0;
    const safePercent = Math.min(Math.max(parsed, 0), 100);
    return (totalAmount * safePercent) / 100;
  }, [installmentProfitPercent, totalAmount]);

  const installmentPayableTotal = useMemo(
    () => totalAmount + installmentProfitValue,
    [totalAmount, installmentProfitValue]
  );

  const installmentDueAmount = useMemo(
    () => Math.max(installmentPayableTotal - paidValue, 0),
    [installmentPayableTotal, paidValue]
  );

  useEffect(() => {
    if (isInstallment) {
      // Installment mode: clear deposit and due on total change
      setDepositAmount("");
      setInstallmentProfitPercent("");
      setDueInput(totalAmount > 0 ? totalAmount.toFixed(2) : "0");
      setPaidAmount("");
    } else {
      // Non-installment mode: full payment by default
      const totalText = totalAmount > 0 ? totalAmount.toFixed(2) : "";
      setPaidAmount(totalText);
      setDepositAmount("");
      setInstallmentProfitPercent("");
      setDueInput("0");
    }
  }, [isInstallment, totalAmount]);

  const handleDepositChange = (value) => {
    const deposit = Number(value || 0);
    const safeDeposit = Number.isNaN(deposit) ? 0 : Math.min(Math.max(deposit, 0), totalAmount);
    const due = Math.max(installmentPayableTotal - safeDeposit, 0);
    setDepositAmount(safeDeposit.toFixed(2));
    setDueInput(due.toFixed(2));
  };

  const handleDueInputChangeInstallment = (value) => {
    const due = Number(value || 0);
    const safeDue = Number.isNaN(due) ? 0 : Math.min(Math.max(due, 0), installmentPayableTotal);
    const rawDeposit = Math.max(installmentPayableTotal - safeDue, 0);
    const deposit = Math.min(rawDeposit, totalAmount);
    const normalizedDue = Math.max(installmentPayableTotal - deposit, 0);
    const percent = totalAmount > 0 ? ((deposit / totalAmount) * 100).toFixed(2) : "0";
    setDueInput(normalizedDue.toFixed(2));
    setDepositAmount(deposit.toFixed(2));
    setInstallmentProfitPercent(percent);
  };

  useEffect(() => {
    if (!isInstallment) return;
    const deposit = Number(depositAmount || 0);
    const safeDeposit = Number.isNaN(deposit) ? 0 : Math.min(Math.max(deposit, 0), totalAmount);
    const nextDue = Math.max(installmentPayableTotal - safeDeposit, 0);
    setDueInput(nextDue.toFixed(2));
  }, [isInstallment, installmentPayableTotal, depositAmount, totalAmount]);

  const handlePaidChangeNonInstallment = (value) => {
    const paid = Number(value || 0);
    const safePaid = Number.isNaN(paid) ? 0 : Math.min(Math.max(paid, 0), totalAmount);
    const due = Math.max(totalAmount - safePaid, 0);
    setPaidAmount(safePaid.toFixed(2));
    setDueInput(due.toFixed(2));
  };

  const handleDueInputChangeNonInstallment = (value) => {
    const due = Number(value || 0);
    const safeDue = Number.isNaN(due) ? 0 : Math.min(Math.max(due, 0), totalAmount);
    const paid = Math.max(totalAmount - safeDue, 0);
    setDueInput(safeDue.toFixed(2));
    setPaidAmount(paid.toFixed(2));
  };

  const addProductToCart = (product) => {
    setSubmitError("");
    if (Number(product.stock || 0) <= 0) {
      setSubmitError(`Product "${product.name}" is out of stock.`);
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
    setCart((prev) =>
      prev.map((entry) =>
        Number(entry.product_id) === Number(productId)
          ? { ...entry, quantity: String(parsed) }
          : entry
      )
    );
  };

  const increaseQuantity = (productId) => {
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

          const nextQty = Number(entry.quantity || 0) - 1;
          return { ...entry, quantity: String(nextQty) };
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
    setSubmitError("");
    barcodeRef.current?.focus();
  };

  const printMemo = async ({ sale, customerName, soldItems, total, paid, due }) => {
    const qrDataUrl = await QRCode.toDataURL(`ORDER:${sale.invoice_no}`, {
      width: 140,
      margin: 1,
      color: {
        dark: "#000000",
        light: "#ffffff",
      },
    });

    const rowsHtml = soldItems
      .map(
        (item, index) => `
          <tr>
            <td style="padding:4px;border:1px solid #d4d4d4;">${index + 1}</td>
            <td style="padding:4px;border:1px solid #d4d4d4;">${item.product?.name || "Unknown"}</td>
            <td style="padding:4px;border:1px solid #d4d4d4;text-align:right;">${item.quantity}</td>
            <td style="padding:4px;border:1px solid #d4d4d4;text-align:right;">${Number(item.unitPrice || 0).toFixed(2)}</td>
            <td style="padding:4px;border:1px solid #d4d4d4;text-align:right;">${Number(item.total || 0).toFixed(2)}</td>
          </tr>
        `
      )
      .join("");

    const printableHtml = `
      <html>
        <head>
          <title>Memo ${sale.invoice_no}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 16px; color: #111; }
            .center { text-align: center; }
            .line { border-top: 1px solid #333; margin: 8px 0; }
            table { width: 100%; border-collapse: collapse; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="center">
            <h2 style="margin:0;">${companyName}</h2>
            <p style="margin:4px 0;">${companyAddress}</p>
            <p style="margin:4px 0;">Proprietor: ${companyProprietor} | Phone: ${companyPhone}</p>
          </div>
          <div class="line"></div>
          <p style="margin:4px 0;"><strong>Order No:</strong> ${sale.invoice_no}</p>
          <p style="margin:4px 0;"><strong>Date:</strong> ${new Date(sale.sale_date || Date.now()).toLocaleString()}</p>
          <p style="margin:4px 0;"><strong>Customer:</strong> ${customerName}</p>
          <div class="line"></div>
          <table>
            <thead>
              <tr>
                <th style="padding:4px;border:1px solid #d4d4d4;">#</th>
                <th style="padding:4px;border:1px solid #d4d4d4;">Product</th>
                <th style="padding:4px;border:1px solid #d4d4d4;">Qty</th>
                <th style="padding:4px;border:1px solid #d4d4d4;">Rate</th>
                <th style="padding:4px;border:1px solid #d4d4d4;">Amount</th>
              </tr>
            </thead>
            <tbody>${rowsHtml}</tbody>
          </table>
          <div class="line"></div>
          <p style="margin:4px 0;"><strong>Total:</strong> ${Number(total).toFixed(2)}</p>
          <p style="margin:4px 0;"><strong>Paid:</strong> ${Number(paid).toFixed(2)}</p>
          <p style="margin:4px 0;"><strong>Due:</strong> ${Number(due).toFixed(2)}</p>
          <div class="center" style="margin-top:12px;">
            <img src="${qrDataUrl}" alt="Order QR" style="height:120px;width:120px;" />
            <p style="margin:6px 0 0;">Scan QR for order: ${sale.invoice_no}</p>
          </div>
        </body>
      </html>
    `;

    const printWindow = window.open("", "_blank", "width=800,height=700");
    if (!printWindow) {
      return;
    }

    printWindow.document.open();
    printWindow.document.write(printableHtml);
    printWindow.document.close();

    await new Promise((resolve) => {
      const images = Array.from(printWindow.document.images || []);
      if (!images.length) {
        resolve();
        return;
      }

      let loaded = 0;
      const done = () => {
        loaded += 1;
        if (loaded >= images.length) {
          resolve();
        }
      };

      images.forEach((img) => {
        if (img.complete) {
          done();
          return;
        }
        img.onload = done;
        img.onerror = done;
      });

      setTimeout(resolve, 2000);
    });

    setTimeout(() => {
      printWindow.focus();
      printWindow.print();
    }, 120);
  };

  const handleCompleteSale = async () => {
    setSubmitError("");

    if (!cartRows.length) {
      setSubmitError("Add product to cart first.");
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

    const currentDueAmount = isInstallment ? installmentDueAmount : dueAmount;
    if (!customerId && currentDueAmount > 0) {
      setSubmitError("Walk-in customer cannot keep due. Select customer or pay full amount.");
      return;
    }

    try {
      setSubmitting(true);
      const created = await apiPost("/api/sales", {
        customer_id: customerId ? Number(customerId) : null,
        items: payloadItems,
        discount_amount: discountValue,
        paid_amount: paid,
        sale_source: "card",
      });

      const customerName =
        customers.find((entry) => Number(entry.id) === Number(created.customer_id))?.name ||
        "Walk-in";

      setProducts((prev) =>
        prev.map((product) => {
          const sold = payloadItems.find((item) => Number(item.product_id) === Number(product.id));
          return sold
            ? { ...product, stock: Number(product.stock || 0) - Number(sold.quantity || 0) }
            : product;
        })
      );

      await printMemo({
        sale: created,
        customerName,
        soldItems: cartRows,
        total: totalAmount,
        paid,
        due: isInstallment ? installmentDueAmount : dueAmount,
      });

      resetCartFlow();
    } catch (err) {
      setSubmitError(err.message || "Failed to complete sale.");
    } finally {
      setSubmitting(false);
    }
  };

  const stats = useMemo(() => {
    const inStock = products.filter((product) => Number(product.stock || 0) > 0).length;
    return [
      { label: "Products", value: String(products.length), hint: "Available in this route" },
      { label: "In Stock", value: String(inStock), hint: "Ready for card sale" },
      { label: "Cart Total", value: formatCurrency(totalAmount), hint: "Live total amount" },
      { label: `Sales (${rangeLabel})`, value: String(periodSales.count), hint: `Total ${formatCurrency(periodSales.total)}` },
      { label: "Paid", value: formatCurrency(periodSales.paid), hint: `Due ${formatCurrency(periodSales.due)}` },
    ];
  }, [periodSales.count, periodSales.due, periodSales.paid, periodSales.total, products, rangeLabel, totalAmount]);

  return (
    <SectionPage
      title="Card"
      description="Card style sale with search, barcode scan, installment and due system."
      stats={stats}
      loading={loading || salesLoading}
      error={error}
    >
      <div className="space-y-2">
        <div className="grid gap-3 md:grid-cols-2">
          <label className="text-xs text-muted-foreground">
            Product Search
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
              placeholder="Search by name, barcode, description"
            />
          </label>

          <label className="text-xs text-muted-foreground">
            Scan Barcode
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
              className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
              placeholder="Scan then press Enter"
            />
          </label>
        </div>

        <div className="rounded-lg border border-border/60 bg-card p-3">
          <div className="flex flex-wrap items-center gap-2">
            {[
              ["daily", "Daily"],
              ["weekly", "Weekly"],
              ["monthly", "Monthly"],
              ["yearly", "Yearly"],
              ["custom", "Select Range"],
              ["all", "All Time"],
            ].map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setPeriod(value)}
                className={`rounded-md border px-3 py-1.5 text-xs font-medium transition ${
                  period === value
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-input text-foreground hover:bg-muted"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {period === "custom" ? (
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              <label className="text-xs text-muted-foreground">
                Start Date
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(event) => setCustomStartDate(event.target.value)}
                  className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
                />
              </label>
              <label className="text-xs text-muted-foreground">
                End Date
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(event) => setCustomEndDate(event.target.value)}
                  className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
                />
              </label>
            </div>
          ) : null}
        </div>

        <div className="grid gap-3 lg:grid-cols-[2fr_1fr]">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filteredProducts.map((product) => (
              <button
                key={product.id}
                type="button"
                onClick={() => addProductToCart(product)}
                className="rounded-lg border h-64 border-border/60 bg-card px-2.5 py-2 text-left transition hover:border-primary/50 hover:bg-muted/20"
              >
                <div className="mb-1">
                  {product.image_url ? (
                    <img
                      src={product.image_url}
                      alt={product.name}
                      className="h-32 w-full rounded-md border border-border/50 object-cover"
                    />
                  ) : (
                    <div className="flex h-32 w-full items-center justify-center rounded-md border border-dashed border-border/60 text-xs text-muted-foreground">
                      No Image
                    </div>
                  )}
                </div>
                <div className="mb-1 flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-foreground">{product.name}</p>
                  <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">
                    Stock {product.stock}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">{product.description || "No description"}</p>
                <p className="mt-1 text-sm font-medium text-foreground">{formatCurrency(product.price)}</p>
              </button>
            ))}
          </div>

          <aside className="rounded-lg border border-border/60 bg-card p-2 lg:sticky lg:top-24 lg:h-fit">
            <h3 className="text-sm font-semibold text-foreground">Cart Details</h3>

            <label className="mt-3 block text-xs text-muted-foreground">
              Customer
              <select
                value={customerId}
                onChange={(event) => setCustomerId(event.target.value)}
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
              >
                <option value="">Walk-in customer</option>
                {customers.map((customer) => (
                  <option key={customer.id} value={customer.id}>
                    {customer.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="mt-2 block text-xs text-muted-foreground">
              Discount Amount
              <input
                type="number"
                min="0"
                step="0.01"
                value={discountAmount}
                onChange={(event) => setDiscountAmount(event.target.value)}
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
                placeholder="0.00"
              />
            </label>

            <div className="mt-2">
              <button
                type="button"
                onClick={() => {
                  setShowNewCustomer((prev) => !prev);
                  setCustomerError("");
                }}
                className="text-xs font-medium text-primary hover:underline"
              >
                {showNewCustomer ? "Close New Customer" : "Add New Customer (Optional)"}
              </button>
            </div>

            {showNewCustomer ? (
              <div className="mt-2 space-y-2 rounded-md border border-border/60 p-2">
                <input
                  name="name"
                  value={newCustomer.name}
                  onChange={handleNewCustomerChange}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs text-foreground"
                  placeholder="Customer name"
                />
                <input
                  name="phone"
                  value={newCustomer.phone}
                  onChange={handleNewCustomerChange}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs text-foreground"
                  placeholder="Phone"
                />
                <input
                  name="address"
                  value={newCustomer.address}
                  onChange={handleNewCustomerChange}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs text-foreground"
                  placeholder="Address"
                />

                {customerError ? <p className="text-xs text-destructive">{customerError}</p> : null}

                <button
                  type="button"
                  onClick={handleAddCustomer}
                  disabled={addingCustomer}
                  className="rounded-md border border-input px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted disabled:opacity-60"
                >
                  {addingCustomer ? "Adding..." : "Save Customer"}
                </button>
              </div>
            ) : null}

            <div className="mt-3 space-y-2">
              {cartRows.length ? (
                cartRows.map((row) => (
                  <div key={row.product_id} className="rounded-md border border-border/50 ">
                    <div className="flex items-center gap-2">
                      {row.product.image_url ? (
                        <img
                          src={row.product.image_url}
                          alt={row.product.name}
                          className="h-10 w-10 rounded-md border border-border/50 object-cover"
                        />
                      ) : (
                        <div className="flex flex-col h-10 w-10 items-center justify-center rounded-md border border-dashed border-border/60 text-[10px] text-muted-foreground">
                          No
                        </div>
                      )}

                      <div className="flex flex-col items-center gap-1">
                        <button
                          type="button"
                          onClick={() => decreaseQuantity(row.product_id)}
                          className="h-5 w-5 rounded border border-input text-[10px] font-semibold leading-none hover:bg-muted"
                        >
                          -
                        </button>

                        <input
                          type="number"
                          min="1"
                          max={row.product.stock}
                          value={row.quantity}
                          onChange={(event) => changeQuantity(row.product_id, event.target.value)}
                          className="h-5 w-10 rounded border border-input bg-background px-1 text-center text-[10px] text-foreground"
                        />

                        <button
                          type="button"
                          onClick={() => increaseQuantity(row.product_id)}
                          className="h-5 w-5 rounded border border-input text-[10px] font-semibold leading-none hover:bg-muted"
                        >
                          +
                        </button>
                      </div>

                      <p className="min-w-0 flex-1 truncate text-xs font-medium text-foreground">{row.product.name}</p>

                      <span className="text-xs text-muted-foreground">{formatCurrency(row.total)}</span>

                      <button
                        type="button"
                        onClick={() => removeFromCart(row.product_id)}
                        className="text-xs text-destructive"
                      >
                        x
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-xs text-muted-foreground">No items in cart.</p>
              )}
            </div>

            <label className="mt-3 flex items-center gap-2 text-xs text-foreground">
              <input
                type="checkbox"
                checked={isInstallment}
                disabled={!customerId}
                onChange={(event) => setIsInstallment(event.target.checked)}
              />
              Installment
            </label>

            {isInstallment ? (
              <div className="mt-2 grid grid-cols-2 gap-2">
                <label className="text-xs text-muted-foreground">
                  Deposit Amount
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={depositAmount}
                    onChange={(event) => handleDepositChange(event.target.value)}
                    className="mt-1 w-full rounded-md border border-input bg-background px-2 py-1 text-xs text-foreground"
                    placeholder="Deposit"
                  />
                </label>
                <label className="text-xs text-muted-foreground">
                  Installment Profit %
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    value={installmentProfitPercent}
                    onChange={(event) => setInstallmentProfitPercent(event.target.value)}
                    className="mt-1 w-full rounded-md border border-input bg-background px-2 py-1 text-xs text-foreground"
                    placeholder="Profit %"
                  />
                </label>
                <label className="text-xs text-muted-foreground col-span-2">
                  Due Amount
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={dueInput}
                    disabled={!customerId}
                    onChange={(event) => handleDueInputChangeInstallment(event.target.value)}
                    className="mt-1 w-full rounded-md border border-input bg-background px-2 py-1 text-xs text-foreground"
                    placeholder="Due"
                  />
                </label>
              </div>
            ) : (
              <div className="mt-2 grid grid-cols-2 gap-2">
                <label className="text-xs text-muted-foreground">
                  Paid Amount
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={paidAmount}
                    onChange={(event) => handlePaidChangeNonInstallment(event.target.value)}
                    className="mt-1 w-full rounded-md border border-input bg-background px-2 py-1 text-xs text-foreground"
                    placeholder="Amount paid now"
                  />
                </label>
                <label className="text-xs text-muted-foreground">
                  Due Amount
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={dueInput}
                    disabled={!customerId}
                    onChange={(event) => handleDueInputChangeNonInstallment(event.target.value)}
                    className="mt-1 w-full rounded-md border border-input bg-background px-2 py-1 text-xs text-foreground"
                    placeholder="Amount due later"
                  />
                </label>
              </div>
            )}

            <div className="mt-3 rounded-md bg-muted/30 p-2 text-xs text-foreground">
              <p>Subtotal: <span className="font-semibold">{formatCurrency(subTotalAmount)}</span></p>
              <p>Discount: <span className="font-semibold">{formatCurrency(discountValue)}</span></p>
              <p>Total: <span className="font-semibold">{formatCurrency(totalAmount)}</span></p>
              {isInstallment ? (
                <>
                  <p>Installment Profit: <span className="font-semibold">{formatCurrency(installmentProfitValue)}</span></p>
                  <p>Installment Payable: <span className="font-semibold">{formatCurrency(installmentPayableTotal)}</span></p>
                </>
              ) : null}
              <p>Paid: <span className="font-semibold">{formatCurrency(paidValue)}</span></p>
              <p>Due: <span className="font-semibold">{formatCurrency(isInstallment ? installmentDueAmount : dueAmount)}</span></p>
            </div>

            {submitError ? <p className="mt-2 text-xs text-destructive">{submitError}</p> : null}

            <div className="mt-3 flex gap-2">
              <button
                type="button"
                onClick={resetCartFlow}
                className="w-full rounded-md border border-input px-3 py-2 text-xs font-medium text-foreground hover:bg-muted"
              >
                Clear
              </button>
              <button
                type="button"
                onClick={handleCompleteSale}
                disabled={submitting || !cartRows.length}
                className="w-full rounded-md bg-primary px-3 py-2 text-xs font-medium text-primary-foreground disabled:opacity-60"
              >
                {submitting ? "Saving..." : "Complete Sale"}
              </button>
            </div>
          </aside>
        </div>

        <div className="overflow-x-auto rounded-lg border border-border/60">
          <table className="w-full min-w-full text-sm">
            <thead className="bg-muted/30 text-left">
              <tr>
                <th className="px-3 py-2">Invoice</th>
                <th className="px-3 py-2">Customer</th>
                <th className="px-3 py-2">Total</th>
                <th className="px-3 py-2">Paid</th>
                <th className="px-3 py-2">Due</th>
                <th className="px-3 py-2">Action</th>
              </tr>
            </thead>
            <tbody>
              {salesList.map((sale) => (
                <tr key={sale.id} className="border-t border-border/50">
                  <td className="px-3 py-2">{sale.invoice_no}</td>
                  <td className="px-3 py-2">{sale.customer_name || "Walk-in"}</td>
                  <td className="px-3 py-2">{formatCurrency(sale.total_amount)}</td>
                  <td className="px-3 py-2">{formatCurrency(sale.paid_amount)}</td>
                  <td className="px-3 py-2">{formatCurrency(sale.due_amount)}</td>
                  <td className="px-3 py-2">
                    <button
                      type="button"
                      onClick={() => openDueDialog(sale)}
                      disabled={Number(sale.due_amount || 0) <= 0 || !sale.customer_id}
                      className="inline-flex items-center gap-1 rounded-md border border-input px-2.5 py-1.5 text-xs font-medium hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <PlusCircle className="h-3.5 w-3.5" />
                      Add Due
                    </button>
                  </td>
                </tr>
              ))}
              {!salesLoading && salesList.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-3 py-6 text-center text-sm text-muted-foreground">
                    No invoices found.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>

      <Dialog open={dueOpen} onOpenChange={setDueOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Add Due Payment</DialogTitle>
            <DialogDescription>Record a payment against this invoice due.</DialogDescription>
          </DialogHeader>

          <form onSubmit={submitDuePayment} className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-md border border-border/60 bg-muted/20 px-3 py-2 text-sm">
                <p className="text-xs text-muted-foreground">Customer</p>
                <p className="font-medium">{dueForm.customer_name || "-"}</p>
              </div>
              <div className="rounded-md border border-border/60 bg-muted/20 px-3 py-2 text-sm">
                <p className="text-xs text-muted-foreground">Remaining Due</p>
                <p className="font-medium">{formatCurrency(dueForm.sale_due || 0)}</p>
              </div>
            </div>

            <label className="block text-xs text-muted-foreground">
              Amount
              <input
                name="amount"
                type="number"
                min="0"
                step="0.01"
                value={dueForm.amount}
                onChange={handleDueFormChange}
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
              />
            </label>

            <label className="block text-xs text-muted-foreground">
              Note
              <input
                name="note"
                value={dueForm.note}
                onChange={handleDueFormChange}
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
                placeholder="Optional note"
              />
            </label>

            {dueError ? <p className="text-sm text-destructive">{dueError}</p> : null}

            <DialogFooter>
              <button
                type="button"
                onClick={() => setDueOpen(false)}
                className="rounded-md border border-input px-4 py-2 text-sm font-medium text-foreground hover:bg-muted"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={dueSubmitting}
                className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60"
              >
                {dueSubmitting ? "Saving..." : "Save Due"}
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </SectionPage>
  );
}

export default CardSale;

