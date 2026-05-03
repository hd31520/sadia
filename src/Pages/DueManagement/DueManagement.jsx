import { useEffect, useMemo, useState } from "react";
import SectionPage from "../Shared/SectionPage";
import { apiDelete, apiGet, apiPost, apiPut, formatCurrency, getStoredUser } from "../../lib/api";
import {
  createSingleMemoItem,
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
  DialogTrigger,
} from "../../components/ui/dialog";

function DueManagement() {
  const [customers, setCustomers] = useState([]);
  const [salesDue, setSalesDue] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedMonth, setSelectedMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [collectOpen, setCollectOpen] = useState(false);
  const [collectSubmitting, setCollectSubmitting] = useState(false);
  const [collectError, setCollectError] = useState("");
  const [collectForm, setCollectForm] = useState({
    customer_id: "",
    sale_id: "",
    customer_name: "",
    customer_address: "",
    reference: "",
    max_due: "0",
    amount: "",
    note: "",
  });
  const [form, setForm] = useState({
    name: "",
    phone: "",
    address: "",
    due_amount: "",
    due_date: "",
  });
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState("");
  const [historyRows, setHistoryRows] = useState([]);
  const [historyCustomer, setHistoryCustomer] = useState(null);
  const [editOpen, setEditOpen] = useState(false);
  const [editType, setEditType] = useState("");
  const [editTarget, setEditTarget] = useState(null);
  const [editError, setEditError] = useState("");
  const [editing, setEditing] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteType, setDeleteType] = useState("");
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteError, setDeleteError] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [editForm, setEditForm] = useState({
    name: "",
    phone: "",
    address: "",
    due_date: "",
    due_amount: "",
  });
  const canManageDue = getStoredUser()?.role === "admin";

  const loadDueCustomers = async () => {
    setLoading(true);
    try {
      const [customerPayload, salesPayload] = await Promise.all([
        apiGet(`/api/customers?history_due=true&month=${selectedMonth}`),
        apiGet(`/api/sales?due_history=true&month=${selectedMonth}`),
      ]);
      setCustomers(customerPayload || []);
      setSalesDue(salesPayload || []);
      setError("");
    } catch (err) {
      setError(err.message || "Failed to load due records");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDueCustomers();
  }, [selectedMonth]);

  const handleFormChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleEditFormChange = (event) => {
    const { name, value } = event.target;
    setEditForm((prev) => ({ ...prev, [name]: value }));
  };

  const resetForm = () => {
    setForm({ name: "", phone: "", address: "", due_amount: "", due_date: "" });
    setSubmitError("");
  };

  const resetCollectForm = () => {
    setCollectForm({
      customer_id: "",
      sale_id: "",
      customer_name: "",
      customer_address: "",
      reference: "",
      max_due: "0",
      amount: "",
      note: "",
    });
    setCollectError("");
  };

  const resetHistoryState = () => {
    setHistoryRows([]);
    setHistoryError("");
    setHistoryCustomer(null);
  };

  const openCollectFromCustomer = (customer) => {
    const due = Number(customer.due_amount || 0);
    setCollectError("");
    setCollectForm({
      customer_id: String(customer.id),
      sale_id: "",
      customer_name: customer.name || "Customer",
      customer_address: customer.address || "",
      reference: `Ledger-${customer.id}`,
      max_due: String(due.toFixed(2)),
      amount: String(due.toFixed(2)),
      note: `Ledger due collection for ${customer.name || "customer"}`,
    });
    setCollectOpen(true);
  };

  const openCollectFromSale = (sale) => {
    const due = Number(sale.due_amount || 0);
    const customerId = Number(sale.customer_id || 0);
    const matchedCustomer = customers.find((customer) => Number(customer.id) === customerId);
    if (!customerId) {
      setCollectError("This invoice is not linked to a customer.");
      return;
    }

    setCollectError("");
    setCollectForm({
      customer_id: String(customerId),
      sale_id: String(sale.id),
      customer_name: sale.customer_name || matchedCustomer?.name || `Customer #${customerId}`,
      customer_address: sale.customer_address || matchedCustomer?.address || "",
      reference: sale.invoice_no || `INV-${sale.id}`,
      max_due: String(due.toFixed(2)),
      amount: String(due.toFixed(2)),
      note: `Invoice due collection for ${sale.invoice_no || `sale ${sale.id}`}`,
    });
    setCollectOpen(true);
  };

  const handleCollectChange = (event) => {
    const { name, value } = event.target;
    setCollectForm((prev) => ({ ...prev, [name]: value }));
  };

  const openHistoryDialog = async (entry) => {
    const customerId = Number(entry.customer_id || entry.id || 0);
    if (!customerId) {
      return;
    }

    const customerRecord =
      customers.find((customer) => Number(customer.id) === customerId) ||
      {
        id: customerId,
        name: entry.customer_name || entry.name || "Customer",
        phone: entry.customer_phone || "",
        address: entry.customer_address || "",
        due_amount: entry.due_amount || 0,
      };

    setHistoryCustomer(customerRecord);
    setHistoryOpen(true);
    setHistoryLoading(true);
    setHistoryError("");

    try {
      const payload = await apiGet(`/api/payments/customer/${customerId}`);
      setHistoryRows(payload || []);
    } catch (err) {
      setHistoryError(err.message || "Failed to load payment history");
      setHistoryRows([]);
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleCollectDue = async (event) => {
    event.preventDefault();
    setCollectError("");

    const customerId = Number(collectForm.customer_id);
    const saleId = collectForm.sale_id ? Number(collectForm.sale_id) : null;
    const maxDue = Number(collectForm.max_due || 0);
    const amount = Number(collectForm.amount || 0);

    if (!customerId || Number.isNaN(customerId)) {
      setCollectError("Valid customer is required.");
      return;
    }

    if (Number.isNaN(amount) || amount <= 0) {
      setCollectError("Enter a valid collection amount.");
      return;
    }

    if (amount > maxDue) {
      setCollectError("Collection amount cannot exceed current due.");
      return;
    }

    try {
      setCollectSubmitting(true);
      const payload = await apiPost("/api/payments", {
        customer_id: customerId,
        sale_id: saleId,
        customer_name: collectForm.customer_name || null,
        customer_address: collectForm.customer_address || null,
        amount,
        note: collectForm.note.trim() || null,
      });

      const paymentInfo = payload?.payment
        ? payload.payment
        : {
            amount,
            payment_date: new Date().toISOString(),
            customer_name: collectForm.customer_name,
            invoice_no: collectForm.sale_id ? collectForm.reference : null,
            sale_source: collectForm.sale_id ? "sale" : "ledger",
            note: collectForm.note,
          };

      await printCollectionMemo(paymentInfo);

      await loadDueCustomers();
      setCollectOpen(false);
      resetCollectForm();
    } catch (err) {
      setCollectError(err.message || "Failed to collect due");
    } finally {
      setCollectSubmitting(false);
    }
  };

  const printCollectionMemo = async (payment, customerContext = null) => {
    const customerAddress =
      payment.customer_address ||
      customerContext?.address ||
      customers.find((customer) => String(customer.id) === String(payment.customer_id || collectForm.customer_id))
        ?.address ||
      "";
    const reference = payment.invoice_no || collectForm.reference || "Ledger";

    await printMemoSheet({
      browserTitle: `Collection ${reference}`,
      title: "বাকি আদায় মেমো",
      memoNo: payment.id ? `ADAY-${payment.id}` : reference,
      date: payment.payment_date,
      customerName: payment.customer_name || customerContext?.name || collectForm.customer_name || "-",
      customerAddress,
      items: [
        createSingleMemoItem({
          quantity: 1,
          description: collectForm.sale_id ? `ইনভয়েস বাকি আদায় (${reference})` : "আগের বাকি আদায়",
          measurement: payment.sale_source === "card" ? "কার্ড" : "হিসাব",
          rate: payment.amount,
          amount: payment.amount,
        }),
      ],
      summaryRows: [{ label: "মোট আদায়", value: payment.amount, highlight: true }],
      note: payment.note || `রেফারেন্স: ${reference}`,
      footerLines: ["বি: দ্রঃ জমার রশিদ বুঝে গ্রহণ করুন।"],
      leftSignatureLabel: "গ্রাহকের স্বাক্ষর",
      rightSignatureLabel: "ক্যাশিয়ার",
    });
  };

  const printDueRowMemo = async (entry) => {
    const customerId = Number(entry.customer_id || entry.id || 0);
    const customerAddress =
      entry.customer_address ||
      customers.find((customer) => Number(customer.id) === customerId)?.address ||
      "";
    const isInvoiceDue = Boolean(entry.invoice_no);
    const reference = isInvoiceDue ? entry.invoice_no : `LEDGER-${customerId || entry.id}`;
    const noteLines = [
      `বর্তমান বাকি ${formatMemoAmount(entry.due_amount)} টাকা।`,
    ];

    if (entry.due_date) {
      noteLines.push(`বাকি তারিখ: ${new Date(entry.due_date).toLocaleDateString("bn-BD")}`);
    }

    await printMemoSheet({
      browserTitle: `Due ${reference}`,
      title: "বাকি মেমো",
      memoNo: isInvoiceDue ? entry.id || reference : customerId || reference,
      date: entry.sale_date || entry.due_date || Date.now(),
      customerName: entry.customer_name || entry.name || "-",
      customerAddress,
      items: [
        createSingleMemoItem({
          serial: 1,
          quantity: 1,
          description: entry.invoice_no ? `ইনভয়েস বাকি (${entry.invoice_no})` : "গ্রাহকের লেজার বাকি",
          measurement: entry.sale_source === "card" ? "কার্ড" : "হিসাব",
          rate: entry.due_amount,
          amount: entry.due_amount,
        }),
      ],
      summaryRows: [{ label: "মোট বাকি", value: entry.due_amount, highlight: true }],
      note: noteLines.join("\n"),
      footerLines: ["বি: দ্রঃ অনুগ্রহ করে দ্রুত বকেয়া পরিশোধ করুন।"],
      leftSignatureLabel: "গ্রাহকের স্বাক্ষর",
      rightSignatureLabel: "বিক্রেতা",
    });
  };

  const handleSubmitOldDue = async (event) => {
    event.preventDefault();
    setSubmitError("");

    const parsedAmount = Number(form.due_amount || 0);
    if (!form.name.trim()) {
      setSubmitError("Customer name is required.");
      return;
    }

    if (Number.isNaN(parsedAmount) || parsedAmount <= 0) {
      setSubmitError("Old due amount must be greater than zero.");
      return;
    }

    try {
      setSubmitting(true);
      await apiPost("/api/customers/old-due", {
        name: form.name.trim(),
        phone: form.phone.trim() || null,
        address: form.address.trim() || null,
        due_amount: parsedAmount,
        due_date: form.due_date || null,
      });

      await loadDueCustomers();
      setOpen(false);
      resetForm();
    } catch (err) {
      setSubmitError(err.message || "Failed to save old due");
    } finally {
      setSubmitting(false);
    }
  };

  const openEditDueDialog = (type, entry) => {
    setEditType(type);
    setEditTarget(entry);
    setEditError("");
    setEditForm({
      name: entry.customer_name || entry.name || "",
      phone: entry.phone || entry.customer_phone || "",
      address: entry.address || entry.customer_address || "",
      due_date: entry.due_date ? String(entry.due_date).slice(0, 10) : "",
      due_amount: String(Number(entry.due_amount || 0)),
    });
    setEditOpen(true);
  };

  const openDeleteDueDialog = (type, entry) => {
    setDeleteType(type);
    setDeleteTarget(entry);
    setDeleteError("");
    setDeleteOpen(true);
  };

  const handleUpdateDue = async (event) => {
    event.preventDefault();
    if (!editTarget) {
      return;
    }

    const parsedDue = Number(editForm.due_amount || 0);
    if (Number.isNaN(parsedDue) || parsedDue < 0) {
      setEditError("Enter a valid due amount.");
      return;
    }

    try {
      setEditing(true);
      if (editType === "sale") {
        await apiPut(`/api/sales/${editTarget.id}/due`, {
          due_amount: parsedDue,
        });
      } else {
        if (!editForm.name.trim()) {
          setEditError("Customer name is required.");
          return;
        }
        await apiPut(`/api/customers/${editTarget.id}`, {
          name: editForm.name.trim(),
          phone: editForm.phone.trim() || null,
          address: editForm.address.trim() || null,
          due_date: editForm.due_date || null,
          due_amount: parsedDue,
        });
      }

      await loadDueCustomers();
      setEditOpen(false);
      setEditTarget(null);
      setEditType("");
    } catch (err) {
      setEditError(err.message || "Failed to update due record");
    } finally {
      setEditing(false);
    }
  };

  const handleDeleteDue = async () => {
    if (!deleteTarget) {
      return;
    }

    try {
      setDeleting(true);
      if (deleteType === "sale") {
        await apiDelete(`/api/sales/${deleteTarget.id}`);
      } else {
        await apiDelete(`/api/customers/${deleteTarget.id}`);
      }

      await loadDueCustomers();
      setDeleteOpen(false);
      setDeleteTarget(null);
      setDeleteType("");
    } catch (err) {
      setDeleteError(err.message || "Failed to delete due record");
    } finally {
      setDeleting(false);
    }
  };

  const stats = useMemo(() => {
    const totalLedgerDue = customers.reduce((acc, customer) => acc + Number(customer.due_amount || 0), 0);
    const totalInvoiceDue = salesDue.reduce((acc, sale) => acc + Number(sale.due_amount || 0), 0);
    const activeLedgerCustomers = customers.filter((customer) => Number(customer.due_amount || 0) > 0).length;
    const activeInvoiceSales = salesDue.filter((sale) => Number(sale.due_amount || 0) > 0).length;

    return [
      { label: "Active Invoice Dues", value: String(activeInvoiceSales), hint: "Invoices still unpaid now" },
      { label: "Invoice Due Total", value: formatCurrency(totalInvoiceDue), hint: "Outstanding invoice balance" },
      { label: "Due History Customers", value: String(customers.length), hint: "Customers kept visible after due clears" },
      { label: "Ledger Due Total", value: formatCurrency(totalLedgerDue), hint: "Current customer balance due total" },
      { label: "Active Ledger Dues", value: String(activeLedgerCustomers), hint: "Customers who still owe now" },
      { label: "Due History Invoices", value: String(salesDue.length), hint: "Invoice records kept after clearing due" },
    ];
  }, [customers, salesDue]);

  const filteredCustomers = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    const matchedCustomers = customers.filter((customer) => {
      const searchableValues = [
        customer.name,
        customer.phone,
        customer.address,
        customer.due_date ? new Date(customer.due_date).toLocaleDateString() : "",
        String(customer.due_amount ?? ""),
      ];

      return !query || searchableValues.some((value) => String(value || "").toLowerCase().includes(query));
    });

    return [...matchedCustomers].sort((left, right) => {
      const leftActive = Number(left.due_amount || 0) > 0 ? 1 : 0;
      const rightActive = Number(right.due_amount || 0) > 0 ? 1 : 0;
      if (leftActive !== rightActive) {
        return rightActive - leftActive;
      }
      return Number(right.id || 0) - Number(left.id || 0);
    });
  }, [customers, searchTerm]);

  const filteredSalesDue = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    const matchedSales = salesDue.filter((sale) =>
      [
        sale.invoice_no,
        sale.customer_name,
        sale.sale_source,
        String(sale.total_amount ?? ""),
        String(sale.paid_amount ?? ""),
        String(sale.due_amount ?? ""),
        sale.sale_date ? new Date(sale.sale_date).toLocaleString() : "",
      ].some((value) => !query || String(value || "").toLowerCase().includes(query))
    );

    return [...matchedSales].sort((left, right) => {
      const leftActive = Number(left.due_amount || 0) > 0 ? 1 : 0;
      const rightActive = Number(right.due_amount || 0) > 0 ? 1 : 0;
      if (leftActive !== rightActive) {
        return rightActive - leftActive;
      }
      return new Date(right.sale_date || 0).getTime() - new Date(left.sale_date || 0).getTime();
    });
  }, [salesDue, searchTerm]);

  const formatSaleSourceLabel = (value) => {
    const normalized = String(value || "").toLowerCase();
    if (["card", "cart", "checkout", "pos"].includes(normalized)) {
      return "cart";
    }
    return normalized || "sale";
  };

  return (
    <SectionPage
      title="Due Management"
      description="Monitor due balances and payment follow-ups."
      stats={stats}
      loading={loading}
      error={error}
    >
      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-border/60 bg-muted/20 p-4">
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Invoice History</p>
          <p className="mt-2 text-2xl font-semibold text-foreground">{filteredSalesDue.length}</p>
          <p className="mt-1 text-xs text-muted-foreground">Active and cleared invoice dues stay visible here.</p>
        </div>
        <div className="rounded-2xl border border-border/60 bg-muted/20 p-4">
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Ledger History</p>
          <p className="mt-2 text-2xl font-semibold text-foreground">{filteredCustomers.length}</p>
          <p className="mt-1 text-xs text-muted-foreground">Customer due history stays visible after clearing.</p>
        </div>
        <div className="rounded-2xl border border-border/60 bg-muted/20 p-4">
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Active Exposure</p>
          <p className="mt-2 text-2xl font-semibold text-foreground">
            {formatCurrency(
              filteredCustomers.reduce((sum, item) => sum + Number(item.due_amount || 0), 0) +
                filteredSalesDue.reduce((sum, item) => sum + Number(item.due_amount || 0), 0)
            )}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">Combined invoice and ledger outstanding amount.</p>
        </div>
      </div>

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex w-full flex-col gap-2 sm:max-w-2xl sm:flex-row">
          <input
            type="search"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Search invoice, customer, phone, address, due..."
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
          />
          <input
            type="month"
            value={selectedMonth}
            onChange={(event) => setSelectedMonth(event.target.value)}
            className="rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground sm:w-44"
          />
        </div>
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
              Add Old Due
            </button>
          </DialogTrigger>

          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Add Old Due</DialogTitle>
              <DialogDescription>Add previous due for a customer with contact details.</DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmitOldDue} className="space-y-3">
              <label className="block text-xs text-muted-foreground">
                Customer Name
                <input
                  name="name"
                  value={form.name}
                  onChange={handleFormChange}
                  className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
                  placeholder="Customer name"
                  required
                />
              </label>

              <label className="block text-xs text-muted-foreground">
                Customer Number
                <input
                  name="phone"
                  value={form.phone}
                  onChange={handleFormChange}
                  className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
                  placeholder="Phone number"
                />
              </label>

              <label className="block text-xs text-muted-foreground">
                Address
                <input
                  name="address"
                  value={form.address}
                  onChange={handleFormChange}
                  className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
                  placeholder="Customer address"
                />
              </label>

              <label className="block text-xs text-muted-foreground">
                Due Date
                <input
                  name="due_date"
                  type="date"
                  value={form.due_date}
                  onChange={handleFormChange}
                  className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
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
                  onChange={handleFormChange}
                  className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
                  placeholder="0.00"
                  required
                />
              </label>

              {submitError ? <p className="text-sm text-destructive">{submitError}</p> : null}

              <DialogFooter>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="rounded-md border border-input px-4 py-2 text-sm font-medium text-foreground hover:bg-muted"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60"
                >
                  {submitting ? "Saving..." : "Save Old Due"}
                </button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="rounded-2xl border border-border/60 bg-card/70 p-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-foreground">Invoice Due History</h3>
            <p className="text-xs text-muted-foreground">Active and cleared invoice dues stay visible here.</p>
          </div>
          <span className="rounded-full border border-border/60 bg-muted/20 px-3 py-1 text-xs text-muted-foreground">
            {filteredSalesDue.length} invoices
          </span>
        </div>

        <div className="overflow-x-auto rounded-xl border border-border/60">
          <table className="w-full min-w-[56rem] text-sm">
            <thead className="bg-muted/30 text-left">
              <tr>
                <th className="px-3 py-2">Invoice</th>
                <th className="px-3 py-2">Customer</th>
                <th className="px-3 py-2">Source</th>
                <th className="px-3 py-2">Sale Date</th>
                <th className="px-3 py-2">Total</th>
                <th className="px-3 py-2">Paid</th>
                <th className="px-3 py-2">Due</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredSalesDue.map((sale) => (
                <tr key={sale.id} className="border-t border-border/50">
                  <td className="px-3 py-2 font-medium">{sale.invoice_no || `INV-${sale.id}`}</td>
                  <td className="px-3 py-2">{sale.customer_name || "Walk-in customer"}</td>
                  <td className="px-3 py-2 capitalize">{formatSaleSourceLabel(sale.sale_source)}</td>
                  <td className="px-3 py-2">
                    {sale.sale_date ? new Date(sale.sale_date).toLocaleString() : "-"}
                  </td>
                  <td className="px-3 py-2">{formatCurrency(sale.total_amount)}</td>
                  <td className="px-3 py-2">{formatCurrency(sale.paid_amount)}</td>
                  <td className="px-3 py-2 font-medium">{formatCurrency(sale.due_amount)}</td>
                  <td className="px-3 py-2">
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                        Number(sale.due_amount || 0) > 0
                          ? "bg-amber-100 text-amber-800"
                          : "bg-emerald-100 text-emerald-800"
                      }`}
                    >
                      {Number(sale.due_amount || 0) > 0 ? "Active Due" : "Cleared History"}
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => openCollectFromSale(sale)}
                        disabled={Number(sale.due_amount || 0) <= 0 || !Number(sale.customer_id || 0)}
                        className="rounded-md border border-input px-3 py-1.5 text-xs font-medium hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Collect
                      </button>
                      <button
                        type="button"
                        onClick={() => openHistoryDialog(sale)}
                        disabled={!Number(sale.customer_id || 0)}
                        className="rounded-md border border-input px-3 py-1.5 text-xs font-medium hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        History
                      </button>
                      <button
                        type="button"
                        onClick={() => printDueRowMemo(sale)}
                        className="rounded-md border border-input px-3 py-1.5 text-xs font-medium hover:bg-muted"
                      >
                        Print
                      </button>
                      {canManageDue ? (
                        <>
                          <button
                            type="button"
                            onClick={() => openEditDueDialog("sale", sale)}
                            className="rounded-md border border-input px-3 py-1.5 text-xs font-medium hover:bg-muted"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => openDeleteDueDialog("sale", sale)}
                            className="rounded-md border border-destructive/50 px-3 py-1.5 text-xs font-medium text-destructive hover:bg-destructive/10"
                          >
                            Delete
                          </button>
                        </>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
              {!loading && filteredSalesDue.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-3 py-6 text-center text-sm text-muted-foreground">
                    No invoice due history records found.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>

      <div className="rounded-2xl border border-border/60 bg-card/70 p-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-foreground">Customer Due History</h3>
            <p className="text-xs text-muted-foreground">Cleared ledger dues stay visible here until you remove records manually.</p>
          </div>
          <span className="rounded-full border border-border/60 bg-muted/20 px-3 py-1 text-xs text-muted-foreground">
            {filteredCustomers.length} customers
          </span>
        </div>

        <div className="overflow-x-auto rounded-xl border border-border/60">
          <table className="w-full min-w-full text-sm">
            <thead className="bg-muted/30 text-left">
              <tr>
                <th className="px-3 py-2">Customer</th>
                <th className="px-3 py-2">Phone</th>
                <th className="px-3 py-2">Address</th>
                <th className="px-3 py-2">Due Date</th>
                <th className="px-3 py-2">Due</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredCustomers.map((customer) => (
                <tr key={customer.id} className="border-t border-border/50">
                  <td className="px-3 py-2 font-medium">{customer.name}</td>
                  <td className="px-3 py-2">{customer.phone || "-"}</td>
                  <td className="px-3 py-2">{customer.address || "-"}</td>
                  <td className="px-3 py-2">
                    {customer.due_date ? new Date(customer.due_date).toLocaleDateString() : "-"}
                  </td>
                  <td className="px-3 py-2 font-medium">{formatCurrency(customer.due_amount)}</td>
                  <td className="px-3 py-2">
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                        Number(customer.due_amount || 0) > 0
                          ? "bg-amber-100 text-amber-800"
                          : "bg-emerald-100 text-emerald-800"
                      }`}
                    >
                      {Number(customer.due_amount || 0) > 0 ? "Active Due" : "Cleared History"}
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => openCollectFromCustomer(customer)}
                        disabled={Number(customer.due_amount || 0) <= 0}
                        className="rounded-md border border-input px-3 py-1.5 text-xs font-medium hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Collect
                      </button>
                      <button
                        type="button"
                        onClick={() => openHistoryDialog(customer)}
                        className="rounded-md border border-input px-3 py-1.5 text-xs font-medium hover:bg-muted"
                      >
                        History
                      </button>
                      <button
                        type="button"
                        onClick={() => printDueRowMemo(customer)}
                        className="rounded-md border border-input px-3 py-1.5 text-xs font-medium hover:bg-muted"
                      >
                        Print
                      </button>
                      {canManageDue ? (
                        <>
                          <button
                            type="button"
                            onClick={() => openEditDueDialog("customer", customer)}
                            className="rounded-md border border-input px-3 py-1.5 text-xs font-medium hover:bg-muted"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => openDeleteDueDialog("customer", customer)}
                            className="rounded-md border border-destructive/50 px-3 py-1.5 text-xs font-medium text-destructive hover:bg-destructive/10"
                          >
                            Delete
                          </button>
                        </>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
              {!loading && filteredCustomers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-3 py-6 text-center text-sm text-muted-foreground">
                    No customer due history records found.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>

      <Dialog
        open={editOpen}
        onOpenChange={(nextOpen) => {
          setEditOpen(nextOpen);
          if (!nextOpen) {
            setEditError("");
            setEditTarget(null);
            setEditType("");
          }
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Due</DialogTitle>
            <DialogDescription>
              {editType === "sale"
                ? "Update invoice due amount. Paid amount will be adjusted from the invoice total."
                : "Update customer ledger due and contact details."}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleUpdateDue} className="space-y-3">
            {editType === "customer" ? (
              <>
                <label className="block text-xs text-muted-foreground">
                  Customer Name
                  <input
                    name="name"
                    value={editForm.name}
                    onChange={handleEditFormChange}
                    className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
                    required
                  />
                </label>

                <label className="block text-xs text-muted-foreground">
                  Customer Number
                  <input
                    name="phone"
                    value={editForm.phone}
                    onChange={handleEditFormChange}
                    className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
                  />
                </label>

                <label className="block text-xs text-muted-foreground">
                  Address
                  <input
                    name="address"
                    value={editForm.address}
                    onChange={handleEditFormChange}
                    className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
                  />
                </label>

                <label className="block text-xs text-muted-foreground">
                  Due Date
                  <input
                    name="due_date"
                    type="date"
                    value={editForm.due_date}
                    onChange={handleEditFormChange}
                    className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
                  />
                </label>
              </>
            ) : (
              <div className="rounded-md border border-border/60 bg-muted/20 px-3 py-2 text-sm">
                <p className="text-xs text-muted-foreground">Invoice</p>
                <p className="font-medium">{editTarget?.invoice_no || `INV-${editTarget?.id || ""}`}</p>
              </div>
            )}

            <label className="block text-xs text-muted-foreground">
              Due Amount
              <input
                name="due_amount"
                type="number"
                min="0"
                step="0.01"
                value={editForm.due_amount}
                onChange={handleEditFormChange}
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
                required
              />
            </label>

            {editError ? <p className="text-sm text-destructive">{editError}</p> : null}

            <DialogFooter>
              <button
                type="button"
                onClick={() => setEditOpen(false)}
                className="rounded-md border border-input px-4 py-2 text-sm font-medium text-foreground hover:bg-muted"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={editing}
                className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60"
              >
                {editing ? "Saving..." : "Save"}
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={deleteOpen}
        onOpenChange={(nextOpen) => {
          setDeleteOpen(nextOpen);
          if (!nextOpen) {
            setDeleteError("");
            setDeleteTarget(null);
            setDeleteType("");
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Due Record</DialogTitle>
            <DialogDescription>
              {deleteType === "sale"
                ? "Delete this invoice due record. The server will block deletion if payment history exists."
                : "Delete this customer ledger record. The server will block deletion if outstanding due remains."}
            </DialogDescription>
          </DialogHeader>

          {deleteError ? <p className="text-sm text-destructive">{deleteError}</p> : null}

          <DialogFooter>
            <button
              type="button"
              onClick={() => setDeleteOpen(false)}
              className="rounded-md border border-input px-4 py-2 text-sm font-medium text-foreground hover:bg-muted"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleDeleteDue}
              disabled={deleting}
              className="rounded-md bg-destructive px-4 py-2 text-sm font-medium text-destructive-foreground disabled:opacity-60"
            >
              {deleting ? "Deleting..." : "Delete"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={collectOpen}
        onOpenChange={(nextOpen) => {
          setCollectOpen(nextOpen);
          if (!nextOpen) {
            resetCollectForm();
          }
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Collect Due</DialogTitle>
            <DialogDescription>Enter deposit amount and collect the due into the database.</DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCollectDue} className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-md border border-border/60 bg-muted/20 px-3 py-2 text-sm">
                <p className="text-xs text-muted-foreground">Customer</p>
                <p className="font-medium">{collectForm.customer_name || "-"}</p>
              </div>
              <div className="rounded-md border border-border/60 bg-muted/20 px-3 py-2 text-sm">
                <p className="text-xs text-muted-foreground">Reference</p>
                <p className="font-medium">{collectForm.reference || "-"}</p>
              </div>
            </div>

            <div className="rounded-md border border-border/60 bg-muted/20 px-3 py-2 text-sm">
              <p className="text-xs text-muted-foreground">Current Due</p>
              <p className="font-medium">{formatCurrency(collectForm.max_due || 0)}</p>
            </div>

            <label className="block text-xs text-muted-foreground">
              Deposit Amount
              <input
                name="amount"
                type="number"
                min="0"
                step="0.01"
                value={collectForm.amount}
                onChange={handleCollectChange}
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
                required
              />
            </label>

            <label className="block text-xs text-muted-foreground">
              Note
              <input
                name="note"
                value={collectForm.note}
                onChange={handleCollectChange}
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
                placeholder="Optional note"
              />
            </label>

            {collectError ? <p className="text-sm text-destructive">{collectError}</p> : null}

            <DialogFooter>
              <button
                type="button"
                onClick={() => setCollectOpen(false)}
                className="rounded-md border border-input px-4 py-2 text-sm font-medium text-foreground hover:bg-muted"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={collectSubmitting}
                className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60"
              >
                {collectSubmitting ? "Collecting..." : "Collect Due"}
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={historyOpen}
        onOpenChange={(nextOpen) => {
          setHistoryOpen(nextOpen);
          if (!nextOpen) {
            resetHistoryState();
          }
        }}
      >
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Payment History</DialogTitle>
            <DialogDescription>
              {historyCustomer
                ? `${historyCustomer.name} - current due ${formatCurrency(historyCustomer.due_amount || 0)}`
                : "Customer payment history"}
            </DialogDescription>
          </DialogHeader>

          {historyCustomer ? (
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-md border border-border/60 bg-muted/20 px-3 py-2 text-sm">
                <p className="text-xs text-muted-foreground">Customer</p>
                <p className="font-medium">{historyCustomer.name || "-"}</p>
              </div>
              <div className="rounded-md border border-border/60 bg-muted/20 px-3 py-2 text-sm">
                <p className="text-xs text-muted-foreground">Phone</p>
                <p className="font-medium">{historyCustomer.phone || "-"}</p>
              </div>
              <div className="rounded-md border border-border/60 bg-muted/20 px-3 py-2 text-sm">
                <p className="text-xs text-muted-foreground">Address</p>
                <p className="font-medium">{historyCustomer.address || "-"}</p>
              </div>
            </div>
          ) : null}

          {historyLoading ? (
            <p className="text-sm text-muted-foreground">Loading payment history...</p>
          ) : historyError ? (
            <p className="text-sm text-destructive">{historyError}</p>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-border/60">
              <table className="w-full min-w-full text-sm">
                <thead className="bg-muted/30 text-left">
                  <tr>
                    <th className="px-3 py-2">Date</th>
                    <th className="px-3 py-2">Amount</th>
                    <th className="px-3 py-2">Reference</th>
                    <th className="px-3 py-2">Type</th>
                    <th className="px-3 py-2">Note</th>
                    <th className="px-3 py-2">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {historyRows.map((payment) => (
                    <tr key={payment.id} className="border-t border-border/50">
                      <td className="px-3 py-2">
                        {payment.payment_date ? new Date(payment.payment_date).toLocaleString() : "-"}
                      </td>
                      <td className="px-3 py-2 font-medium">{formatCurrency(payment.amount)}</td>
                      <td className="px-3 py-2">{payment.invoice_no || "Ledger"}</td>
                      <td className="px-3 py-2 capitalize">
                        {["card", "cart"].includes(String(payment.sale_source || "").toLowerCase())
                          ? "cart"
                          : payment.sale_source || "ledger"}
                      </td>
                      <td className="px-3 py-2">{payment.note || "-"}</td>
                      <td className="px-3 py-2">
                        <button
                          type="button"
                          onClick={() => printCollectionMemo(payment, historyCustomer)}
                          className="rounded-md border border-input px-3 py-1.5 text-xs font-medium hover:bg-muted"
                        >
                          Print
                        </button>
                      </td>
                    </tr>
                  ))}
                  {!historyRows.length ? (
                    <tr>
                      <td colSpan={6} className="px-3 py-6 text-center text-sm text-muted-foreground">
                        No payment history found for this customer.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          )}

          <DialogFooter>
            <button
              type="button"
              onClick={() => setHistoryOpen(false)}
              className="rounded-md border border-input px-4 py-2 text-sm font-medium text-foreground hover:bg-muted"
            >
              Close
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SectionPage>
  );
}

export default DueManagement;

