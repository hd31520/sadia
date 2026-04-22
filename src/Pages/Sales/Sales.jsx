import { useEffect, useMemo, useState } from "react";
import QRCode from "qrcode";
import { Eye, MoreVertical, Printer, PlusCircle } from "lucide-react";
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
  DialogTrigger,
} from "../../components/ui/dialog";

const formatUnitLabel = (unitType) => {
  const normalized = String(unitType || "piece").toLowerCase();
  if (normalized === "dozen") return "Dozen";
  if (normalized === "set") return "Set";
  return "Piece";
};

function Sales() {
  const companyName = import.meta.env.VITE_COMPANY_NAME || "M/s Sadia Auto Parts";
  const companyAddress = import.meta.env.VITE_COMPANY_ADDRESS || "Kanaipur , Faridpur";
  const companyProprietor = import.meta.env.VITE_COMPANY_PROPRIETOR || "Owner";
  const companyPhone = import.meta.env.VITE_COMPANY_PHONE || "+8801741165673";

  const [sales, setSales] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [menuSaleId, setMenuSaleId] = useState(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState("");
  const [detailSale, setDetailSale] = useState(null);
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
  const [barcodeValue, setBarcodeValue] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [scanning, setScanning] = useState(false);
  const [isInstallment, setIsInstallment] = useState(false);
  const [installmentProfitPercent, setInstallmentProfitPercent] = useState("");
  const [period, setPeriod] = useState("daily");
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");
  const [form, setForm] = useState({
    customer_id: "",
    discount_amount: "",
    paid_amount: "",
    deposit_amount: "",
    installment_percent: "",
    due_amount: "0",
    items: [{ product_id: "", quantity: "1" }],
  });

  const rangeQuery = useMemo(
    () => buildDateRangeQuery(period, customStartDate, customEndDate),
    [period, customStartDate, customEndDate]
  );

  useEffect(() => {
    let active = true;

    const loadSales = async () => {
      try {
        setLoading(true);
        const params = new URLSearchParams();
        if (rangeQuery.start_date) params.set("start_date", rangeQuery.start_date);
        if (rangeQuery.end_date) params.set("end_date", rangeQuery.end_date);

        const [salesPayload, customerPayload, productPayload] = await Promise.all([
          apiGet(`/api/sales${params.toString() ? `?${params.toString()}` : ""}`),
          apiGet("/api/customers"),
          apiGet("/api/products"),
        ]);
        if (active) {
          setSales(salesPayload);
          setCustomers(customerPayload || []);
          setProducts(productPayload || []);
          setError("");
        }
      } catch (err) {
        if (active) {
          setError(err.message || "Failed to load sales");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    loadSales();

    return () => {
      active = false;
    };
  }, [rangeQuery.end_date, rangeQuery.start_date]);

  useEffect(() => {
    if (period !== "custom") {
      const preset = getDateRangePreset(period);
      setCustomStartDate(preset.startDate);
      setCustomEndDate(preset.endDate);
    }
  }, [period]);

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

  const loadSaleDetail = async (saleId) => {
    setDetailLoading(true);
    setDetailError("");
    try {
      const payload = await apiGet(`/api/sales/${saleId}`);
      setDetailSale(payload);
      return payload;
    } catch (err) {
      setDetailError(err.message || "Failed to load sale details");
      throw err;
    } finally {
      setDetailLoading(false);
    }
  };

  const openSaleDetail = async (sale) => {
    setMenuSaleId(null);
    setDetailOpen(true);
    setDetailSale(null);
    await loadSaleDetail(sale.id);
  };

  const openPrintInvoice = async (sale) => {
    setMenuSaleId(null);
    const payload = detailSale?.id === sale.id ? detailSale : await loadSaleDetail(sale.id);
    await printMemo({
      sale: payload,
      customerName: payload.customer_name || sale.customer_name || "Walk-in",
      soldItems: payload.items || [],
      total: payload.total_amount,
      paid: payload.paid_amount,
      due: payload.due_amount,
    });
  };

  const openDueDialog = (sale) => {
    setMenuSaleId(null);
    setDueError("");

    const customerId = Number(sale.customer_id || 0);
    if (!customerId) {
      setDueError("This invoice has no customer. Please create due payment from a customer-linked sale.");
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

      setSales((prev) =>
        prev.map((sale) =>
          Number(sale.id) === Number(dueForm.sale_id)
            ? {
                ...sale,
                paid_amount: Number(sale.paid_amount || 0) + amount,
                due_amount: Math.max(Number(sale.due_amount || 0) - amount, 0),
              }
            : sale
        )
      );

      if (detailSale && Number(detailSale.id) === Number(dueForm.sale_id)) {
        setDetailSale((prev) =>
          prev
            ? {
                ...prev,
                paid_amount: Number(prev.paid_amount || 0) + amount,
                due_amount: Math.max(Number(prev.due_amount || 0) - amount, 0),
              }
            : prev
        );
      }

      setDueOpen(false);
    } catch (err) {
      setDueError(err.message || "Failed to record due payment");
    } finally {
      setDueSubmitting(false);
    }
  };

  const stats = useMemo(() => {
    const total = sales.reduce((acc, sale) => acc + Number(sale.total_amount || 0), 0);
    const paid = sales.reduce((acc, sale) => acc + Number(sale.paid_amount || 0), 0);
    const due = sales.reduce((acc, sale) => acc + Number(sale.due_amount || 0), 0);
    return [
      { label: `Invoices (${rangeLabel})`, value: String(sales.length), hint: "Total recorded invoices" },
      { label: `Total Sales (${rangeLabel})`, value: formatCurrency(total), hint: `Collected ${formatCurrency(paid)}` },
      { label: "Outstanding", value: formatCurrency(due), hint: "Remaining due in sales" },
    ];
  }, [rangeLabel, sales]);

  const filteredSales = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) {
      return sales;
    }

    return sales.filter((sale) => {
      const searchableValues = [
        sale.invoice_no,
        sale.customer_name || "Walk-in",
        String(sale.total_amount ?? ""),
        String(sale.paid_amount ?? ""),
        String(sale.due_amount ?? ""),
        sale.sale_date ? new Date(sale.sale_date).toLocaleString() : "",
      ];

      return searchableValues.some((value) => String(value || "").toLowerCase().includes(query));
    });
  }, [sales, searchTerm]);

  const lineItemsWithProducts = useMemo(
    () =>
      form.items.map((item) => {
        const product = products.find((entry) => Number(entry.id) === Number(item.product_id));
        const quantity = Number(item.quantity || 0);
        const unitPrice = Number(product?.price || 0);
        return {
          ...item,
          product,
          quantity,
          lineTotal: quantity > 0 ? quantity * unitPrice : 0,
        };
      }),
    [form.items, products]
  );

  const subTotal = useMemo(
    () => lineItemsWithProducts.reduce((sum, item) => sum + Number(item.lineTotal || 0), 0),
    [lineItemsWithProducts]
  );

  const discountAmount = useMemo(() => {
    const parsed = Number(form.discount_amount || 0);
    if (Number.isNaN(parsed)) return 0;
    return Math.min(Math.max(parsed, 0), subTotal);
  }, [form.discount_amount, subTotal]);

  const calculatedTotal = useMemo(() => Math.max(subTotal - discountAmount, 0), [subTotal, discountAmount]);

  const calculatedPaid = useMemo(() => {
    if (isInstallment) {
      const deposit = Number(form.deposit_amount || 0);
      return Number.isNaN(deposit) ? 0 : deposit;
    } else {
      const paid = Number(form.paid_amount || 0);
      return Number.isNaN(paid) ? 0 : paid;
    }
  }, [isInstallment, form.deposit_amount, form.paid_amount]);

  const calculatedDue = useMemo(() => {
    return Math.max(calculatedTotal - calculatedPaid, 0);
  }, [calculatedTotal, calculatedPaid]);

  const installmentProfitValue = useMemo(() => {
    const parsed = Number(installmentProfitPercent || 0);
    if (Number.isNaN(parsed)) return 0;
    const safePercent = Math.min(Math.max(parsed, 0), 100);
    return (calculatedTotal * safePercent) / 100;
  }, [installmentProfitPercent, calculatedTotal]);

  const installmentPayableTotal = useMemo(
    () => calculatedTotal + installmentProfitValue,
    [calculatedTotal, installmentProfitValue]
  );

  useEffect(() => {
    if (isInstallment) {
      // Installment mode: clear deposit
      setInstallmentProfitPercent("");
      setForm((prev) => ({
        ...prev,
        deposit_amount: "",
        installment_percent: "",
        due_amount: "0",
        paid_amount: "",
      }));
    } else {
      // Non-installment mode: full payment by default
      setInstallmentProfitPercent("");
      setForm((prev) => ({
        ...prev,
        paid_amount: calculatedTotal > 0 ? String(calculatedTotal.toFixed(2)) : "",
        deposit_amount: "",
        installment_percent: "",
        due_amount: "0",
      }));
    }
  }, [isInstallment, calculatedTotal]);

  const handleFormChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleDepositChange = (value) => {
    const deposit = Number(value || 0);
    const safeDeposit = Number.isNaN(deposit) ? 0 : Math.min(Math.max(deposit, 0), calculatedTotal);
    const due = Math.max(calculatedTotal - safeDeposit, 0);
    const percent = calculatedTotal > 0 ? ((safeDeposit / calculatedTotal) * 100).toFixed(2) : "0";

    setForm((prev) => ({
      ...prev,
      deposit_amount: value,
      installment_percent: percent,
      due_amount: due.toFixed(2),
    }));
  };

  const handleInstallmentPercentChange = (value) => {
    const percent = Number(value || 0);
    const safePercent = Number.isNaN(percent) ? 0 : Math.min(Math.max(percent, 0), 100);
    const deposit = (calculatedTotal * safePercent) / 100;
    const due = Math.max(calculatedTotal - deposit, 0);

    setForm((prev) => ({
      ...prev,
      installment_percent: value,
      deposit_amount: deposit.toFixed(2),
      due_amount: due.toFixed(2),
    }));
  };

  const handleInstallmentDueChange = (value) => {
    const due = Number(value || 0);
    const safeDue = Number.isNaN(due) ? 0 : Math.min(Math.max(due, 0), calculatedTotal);
    const deposit = Math.max(calculatedTotal - safeDue, 0);
    const percent = calculatedTotal > 0 ? ((deposit / calculatedTotal) * 100).toFixed(2) : "0";

    setForm((prev) => ({
      ...prev,
      due_amount: value,
      deposit_amount: deposit.toFixed(2),
      installment_percent: percent,
    }));
  };

  const handlePaidChange = (value) => {
    const paid = Number(value || 0);
    const safePaid = Number.isNaN(paid) ? 0 : Math.min(Math.max(paid, 0), calculatedTotal);
    const due = Math.max(calculatedTotal - safePaid, 0);

    setForm((prev) => ({
      ...prev,
      paid_amount: value,
      due_amount: due.toFixed(2),
    }));
  };

  const handleDueChange = (value) => {
    const due = Number(value || 0);
    const safeDue = Number.isNaN(due) ? 0 : Math.min(Math.max(due, 0), calculatedTotal);
    const paid = Math.max(calculatedTotal - safeDue, 0);

    setForm((prev) => ({
      ...prev,
      due_amount: value,
      paid_amount: paid.toFixed(2),
    }));
  };

  const handleItemChange = (index, field, value) => {
    setForm((prev) => {
      const nextItems = prev.items.map((item, itemIndex) =>
        itemIndex === index ? { ...item, [field]: value } : item
      );
      return { ...prev, items: nextItems };
    });
  };

  const addItemRow = () => {
    setForm((prev) => ({
      ...prev,
      items: [...prev.items, { product_id: "", quantity: "1" }],
    }));
  };

  const removeItemRow = (index) => {
    setForm((prev) => {
      if (prev.items.length === 1) {
        return prev;
      }
      return {
        ...prev,
        items: prev.items.filter((_, itemIndex) => itemIndex !== index),
      };
    });
  };

  const addOrIncreaseProduct = (product) => {
    setForm((prev) => {
      const existingIndex = prev.items.findIndex(
        (entry) => Number(entry.product_id) === Number(product.id)
      );

      let nextItems = [...prev.items];
      if (existingIndex >= 0) {
        const currentQty = Number(nextItems[existingIndex].quantity || 0);
        nextItems[existingIndex] = {
          ...nextItems[existingIndex],
          quantity: String(currentQty + 1),
        };
      } else if (
        nextItems.length === 1 &&
        !nextItems[0].product_id &&
        Number(nextItems[0].quantity || 1) === 1
      ) {
        nextItems[0] = { product_id: String(product.id), quantity: "1" };
      } else {
        nextItems.push({ product_id: String(product.id), quantity: "1" });
      }

      return { ...prev, items: nextItems };
    });
  };

  const handleBarcodeScan = async () => {
    const code = barcodeValue.trim();
    if (!code) {
      return;
    }

    try {
      setScanning(true);
      setSubmitError("");
      const product = await apiGet(`/api/products/barcode/${encodeURIComponent(code)}`);
      if (Number(product.stock || 0) <= 0) {
        setSubmitError("Scanned product is out of stock.");
        return;
      }
      addOrIncreaseProduct(product);
      setBarcodeValue("");
    } catch (err) {
      setSubmitError(err.message || "Barcode not found");
    } finally {
      setScanning(false);
    }
  };

  const resetForm = () => {
    setForm({
      customer_id: "",
      discount_amount: "",
      paid_amount: "",
      deposit_amount: "",
      installment_percent: "",
      due_amount: "0",
      items: [{ product_id: "", quantity: "1" }],
    });
    setBarcodeValue("");
    setIsInstallment(false);
    setInstallmentProfitPercent("");
    setSubmitError("");
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
            <td style="padding:4px;border:1px solid #d4d4d4;">${item.product?.name || item.product_name || "Unknown"}</td>
            <td style="padding:4px;border:1px solid #d4d4d4;text-align:right;">${item.quantity} ${formatUnitLabel(item.product?.unit_type || item.unit_type)}</td>
            <td style="padding:4px;border:1px solid #d4d4d4;text-align:right;">${Number(item.product?.price ?? item.unit_price ?? 0).toFixed(2)}</td>
            <td style="padding:4px;border:1px solid #d4d4d4;text-align:right;">${Number(item.lineTotal ?? item.total_price ?? 0).toFixed(2)}</td>
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

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitError("");

    const items = form.items
      .map((item) => ({
        product_id: Number(item.product_id),
        quantity: Number(item.quantity),
      }))
      .filter((item) => item.product_id && item.quantity > 0);

    const outOfStockItem = items.find((item) => {
      const product = products.find((entry) => Number(entry.id) === Number(item.product_id));
      return !product || Number(item.quantity) > Number(product.stock || 0);
    });

    if (outOfStockItem) {
      setSubmitError("One or more items exceed available stock.");
      return;
    }

    if (!items.length) {
      setSubmitError("Add at least one valid product item.");
      return;
    }

    const paidAmount = calculatedPaid;
    if (Number.isNaN(paidAmount) || paidAmount < 0) {
      setSubmitError("Paid amount must be a non-negative number.");
      return;
    }

    if (paidAmount > calculatedTotal) {
      setSubmitError("Paid amount cannot exceed sale total.");
      return;
    }

    if (!form.customer_id && calculatedDue > 0) {
      setSubmitError("Walk-in customer cannot keep due. Select customer or pay full amount.");
      return;
    }

    const selectedItems = lineItemsWithProducts.filter(
      (item) => item.product && item.quantity > 0
    );

    try {
      setSubmitting(true);
      const created = await apiPost("/api/sales", {
        customer_id: form.customer_id ? Number(form.customer_id) : null,
        items,
        discount_amount: discountAmount,
        paid_amount: paidAmount,
        sale_source: "sale",
      });

      const customerName =
        customers.find((entry) => Number(entry.id) === Number(created.customer_id))?.name || "Walk-in";

      setSales((prev) => [{ ...created, customer_name: customerName }, ...prev]);
      setProducts((prev) =>
        prev.map((product) => {
          const sold = items.find((item) => Number(item.product_id) === Number(product.id));
          return sold
            ? { ...product, stock: Number(product.stock || 0) - Number(sold.quantity || 0) }
            : product;
        })
      );

      await printMemo({
        sale: created,
        customerName,
        soldItems: selectedItems,
        total: calculatedTotal,
        paid: paidAmount,
        due: calculatedDue,
      });

      resetForm();
      setOpen(false);
    } catch (err) {
      setSubmitError(err.message || "Failed to create sale");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SectionPage
      title="Sale"
      description="Manage billing, invoices, and recent transactions."
      stats={stats}
      loading={loading}
      error={error}
    >
      <div className="space-y-4">
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

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <input
            type="search"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Search invoice, customer, amount, date..."
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground sm:max-w-sm"
          />
          <Dialog
            open={open}
            onOpenChange={(nextOpen) => {
              setOpen(nextOpen);
              if (!nextOpen) {
                resetForm();
              }
            }}
          >
            <DialogTrigger asChild>
              <button className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
                Add Sale
              </button>
            </DialogTrigger>

            <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-190">
              <DialogHeader>
                <DialogTitle>Add Sale</DialogTitle>
                <DialogDescription>Create a new sale invoice with customer and product items.</DialogDescription>
              </DialogHeader>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="block text-xs text-muted-foreground sm:col-span-2">
                    Barcode Scanner
                    <div className="mt-1 flex gap-2">
                      <input
                        value={barcodeValue}
                        onChange={(event) => setBarcodeValue(event.target.value)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter") {
                            event.preventDefault();
                            handleBarcodeScan();
                          }
                        }}
                        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
                        placeholder="Scan barcode and press Enter"
                      />
                      <button
                        type="button"
                        onClick={handleBarcodeScan}
                        disabled={scanning}
                        className="rounded-md border border-input px-3 py-2 text-xs font-medium hover:bg-muted disabled:opacity-60"
                      >
                        {scanning ? "Scanning..." : "Scan"}
                      </button>
                    </div>
                  </label>

                  <label className="block text-xs text-muted-foreground">
                    Customer
                    <select
                      name="customer_id"
                      value={form.customer_id}
                      onChange={handleFormChange}
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

                  <label className="block text-xs text-muted-foreground">
                    Discount Amount
                    <input
                      name="discount_amount"
                      type="number"
                      min="0"
                      step="0.01"
                      value={form.discount_amount}
                      onChange={handleFormChange}
                      className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
                      placeholder="0.00"
                    />
                  </label>

                  <div className="space-y-2">
                    <label className="flex items-center gap-2 text-xs text-foreground">
                      <input
                        type="checkbox"
                        checked={isInstallment}
                        disabled={!form.customer_id}
                        onChange={(event) => setIsInstallment(event.target.checked)}
                      />
                      Installment
                    </label>

                    {isInstallment ? (
                      <div className="grid gap-2">
                        <label className="block text-xs text-muted-foreground">
                          Deposit Amount
                          <input
                            name="deposit_amount"
                            type="number"
                            min="0"
                            step="0.01"
                            value={form.deposit_amount}
                            onChange={(event) => handleDepositChange(event.target.value)}
                            className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
                            placeholder="0.00"
                          />
                        </label>
                        <label className="block text-xs text-muted-foreground">
                          Installment Percent (%)
                          <input
                            name="installment_percent"
                            type="number"
                            min="0"
                            max="100"
                            step="0.01"
                            value={form.installment_percent}
                            onChange={(event) => handleInstallmentPercentChange(event.target.value)}
                            className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
                            placeholder="0 - 100"
                          />
                        </label>
                        <label className="block text-xs text-muted-foreground">
                          Installment Profit (%)
                          <input
                            type="number"
                            min="0"
                            max="100"
                            step="0.01"
                            value={installmentProfitPercent}
                            onChange={(event) => setInstallmentProfitPercent(event.target.value)}
                            className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
                            placeholder="0 - 100"
                          />
                        </label>
                        <label className="block text-xs text-muted-foreground">
                          Due Amount
                          <input
                            name="due_amount"
                            type="number"
                            min="0"
                            step="0.01"
                            value={form.due_amount}
                            disabled={!form.customer_id}
                            onChange={(event) => handleInstallmentDueChange(event.target.value)}
                            className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
                            placeholder="0.00"
                          />
                        </label>
                      </div>
                    ) : (
                      <label className="block text-xs text-muted-foreground">
                        Paid Amount
                        <input
                          name="paid_amount"
                          type="number"
                          min="0"
                          step="0.01"
                          value={form.paid_amount}
                          onChange={(event) => handlePaidChange(event.target.value)}
                          className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
                          placeholder="0.00"
                        />
                      </label>
                    )}
                  </div>
                </div>

                {!isInstallment ? (
                  <div className="block text-xs text-muted-foreground">
                    <label>
                      Due Amount
                      <input
                        name="due_amount"
                        type="number"
                        min="0"
                        step="0.01"
                        value={form.due_amount}
                        disabled={!form.customer_id}
                        onChange={(event) => handleDueChange(event.target.value)}
                        className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
                        placeholder="0.00"
                      />
                    </label>
                  </div>
                ) : null}

                <div className="space-y-2 rounded-md border border-border/60 p-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-foreground">Sale Items</p>
                    <button
                      type="button"
                      onClick={addItemRow}
                      className="rounded-md border border-input px-3 py-1 text-xs font-medium hover:bg-muted"
                    >
                      Add Item
                    </button>
                  </div>

                  {lineItemsWithProducts.map((item, index) => (
                    <div key={index} className="grid gap-2 rounded-md border border-border/40 p-2 sm:grid-cols-[2fr_1fr_auto]">
                      <select
                        value={item.product_id}
                        onChange={(event) => handleItemChange(index, "product_id", event.target.value)}
                        className="rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
                      >
                        <option value="">Select product</option>
                        {products.map((product) => (
                          <option key={product.id} value={product.id}>
                            {product.name} (Stock: {product.stock} {formatUnitLabel(product.unit_type)})
                          </option>
                        ))}
                      </select>

                      <input
                        type="number"
                        min="1"
                        step="1"
                        value={item.quantity}
                        onChange={(event) => handleItemChange(index, "quantity", event.target.value)}
                        className="rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
                        placeholder="Qty"
                      />

                      <button
                        type="button"
                        onClick={() => removeItemRow(index)}
                        disabled={form.items.length === 1}
                        className="rounded-md border border-destructive/50 px-3 py-2 text-xs font-medium text-destructive hover:bg-destructive/10 disabled:opacity-50"
                      >
                        Remove
                      </button>

                      <div className="sm:col-span-3 text-xs text-muted-foreground">
                        Unit Price: {formatCurrency(item.product?.price || 0)} | Qty Unit: {formatUnitLabel(item.product?.unit_type)} | Line Total: {formatCurrency(item.lineTotal)}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="rounded-md bg-muted/30 p-3 text-sm">
                  <p>Subtotal: <span className="font-medium">{formatCurrency(subTotal)}</span></p>
                  <p>Discount: <span className="font-medium">{formatCurrency(discountAmount)}</span></p>
                  <p>Total: <span className="font-medium">{formatCurrency(calculatedTotal)}</span></p>
                  {isInstallment ? (
                    <>
                      <p>Installment Profit: <span className="font-medium">{formatCurrency(installmentProfitValue)}</span></p>
                      <p>Installment Payable: <span className="font-medium">{formatCurrency(installmentPayableTotal)}</span></p>
                    </>
                  ) : null}
                  <p>Paid: <span className="font-medium">{formatCurrency(calculatedPaid)}</span></p>
                  <p>Due: <span className="font-medium">{formatCurrency(calculatedDue)}</span></p>
                </div>

                {submitError ? <p className="text-sm text-destructive">{submitError}</p> : null}

                <DialogFooter>
                  <button
                    type="button"
                    onClick={() => {
                      setOpen(false);
                      resetForm();
                    }}
                    className="rounded-md border border-input px-4 py-2 text-sm font-medium text-foreground hover:bg-muted"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60"
                  >
                    {submitting ? "Saving..." : "Create Sale"}
                  </button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

      <div className="overflow-x-auto rounded-lg border border-border/60">
        <table className="w-full min-w-175 text-sm">
          <thead className="bg-muted/30 text-left">
            <tr>
              <th className="px-3 py-2">Invoice</th>
              <th className="px-3 py-2">Customer</th>
              <th className="px-3 py-2">Total</th>
              <th className="px-3 py-2">Paid</th>
              <th className="px-3 py-2">Due</th>
              <th className="px-3 py-2">Date</th>
              <th className="px-3 py-2 text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            {filteredSales.map((sale) => (
              <tr key={sale.id} className="border-t border-border/50">
                <td className="px-3 py-2">{sale.invoice_no}</td>
                <td className="px-3 py-2">{sale.customer_name || "Walk-in"}</td>
                <td className="px-3 py-2">{formatCurrency(sale.total_amount)}</td>
                <td className="px-3 py-2">{formatCurrency(sale.paid_amount)}</td>
                <td className="px-3 py-2">{formatCurrency(sale.due_amount)}</td>
                <td className="px-3 py-2">{new Date(sale.sale_date).toLocaleString()}</td>
                <td className="px-3 py-2 text-right">
                  <div className="relative inline-block text-left">
                    <button
                      type="button"
                      onClick={() => setMenuSaleId((current) => (current === sale.id ? null : sale.id))}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-input bg-background text-foreground hover:bg-muted"
                      aria-label="Sale actions"
                    >
                      <MoreVertical className="h-4 w-4" />
                    </button>

                    {menuSaleId === sale.id ? (
                      <div className="absolute right-0 top-9 z-20 w-48 rounded-md border border-border/60 bg-background p-1 shadow-lg">
                        <button
                          type="button"
                          onClick={() => openSaleDetail(sale)}
                          className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm hover:bg-muted"
                        >
                          <Eye className="h-4 w-4" />
                          View Details
                        </button>
                        <button
                          type="button"
                          onClick={() => openPrintInvoice(sale)}
                          className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm hover:bg-muted"
                        >
                          <Printer className="h-4 w-4" />
                          Print Invoice
                        </button>
                        <button
                          type="button"
                          onClick={() => openDueDialog(sale)}
                          disabled={Number(sale.due_amount || 0) <= 0 || !sale.customer_id}
                          className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <PlusCircle className="h-4 w-4" />
                          Add Due
                        </button>
                      </div>
                    ) : null}
                  </div>
                </td>
              </tr>
            ))}
            {!loading && filteredSales.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-3 py-6 text-center text-sm text-muted-foreground">
                  No sales found.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Sale Details</DialogTitle>
            <DialogDescription>View invoice items, payment summary, and print options.</DialogDescription>
          </DialogHeader>

          {detailLoading ? (
            <p className="text-sm text-muted-foreground">Loading sale details...</p>
          ) : detailError ? (
            <p className="text-sm text-destructive">{detailError}</p>
          ) : detailSale ? (
            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2 text-sm">
                <div>
                  <p className="text-muted-foreground">Invoice</p>
                  <p className="font-medium">{detailSale.invoice_no}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Customer</p>
                  <p className="font-medium">{detailSale.customer_name || "Walk-in"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Date</p>
                  <p className="font-medium">{new Date(detailSale.sale_date).toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Created By</p>
                  <p className="font-medium">{detailSale.created_by_name || "-"}</p>
                </div>
              </div>

              <div className="overflow-x-auto rounded-lg border border-border/60">
                <table className="w-full min-w-175 text-sm">
                  <thead className="bg-muted/30 text-left">
                    <tr>
                      <th className="px-3 py-2">Product</th>
                      <th className="px-3 py-2">Qty</th>
                      <th className="px-3 py-2">Rate</th>
                      <th className="px-3 py-2">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(detailSale.items || []).map((item) => (
                      <tr key={item.id} className="border-t border-border/50">
                        <td className="px-3 py-2">{item.product_name || item.product?.name || "Unknown"}</td>
                        <td className="px-3 py-2">{item.quantity} {formatUnitLabel(item.unit_type)}</td>
                        <td className="px-3 py-2">{formatCurrency(item.unit_price)}</td>
                        <td className="px-3 py-2">{formatCurrency(item.total_price)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="grid gap-2 rounded-md bg-muted/30 p-3 text-sm sm:grid-cols-3">
                <p>Total: <span className="font-medium">{formatCurrency(detailSale.total_amount)}</span></p>
                <p>Paid: <span className="font-medium">{formatCurrency(detailSale.paid_amount)}</span></p>
                <p>Due: <span className="font-medium">{formatCurrency(detailSale.due_amount)}</span></p>
              </div>

              <DialogFooter>
                <button
                  type="button"
                  onClick={() => openPrintInvoice(detailSale)}
                  className="rounded-md border border-input px-4 py-2 text-sm font-medium text-foreground hover:bg-muted"
                >
                  Print Invoice
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setDetailOpen(false);
                    openDueDialog(detailSale);
                  }}
                  disabled={Number(detailSale.due_amount || 0) <= 0 || !detailSale.customer_id}
                  className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60"
                >
                  Add Due
                </button>
              </DialogFooter>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog open={dueOpen} onOpenChange={setDueOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Add Due Payment</DialogTitle>
            <DialogDescription>Record a payment against this sale and reduce the remaining due.</DialogDescription>
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
      </div>
    </SectionPage>
  );
}

export default Sales;

