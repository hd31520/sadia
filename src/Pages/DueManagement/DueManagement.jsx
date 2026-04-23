import { useEffect, useMemo, useState } from "react";
import SectionPage from "../Shared/SectionPage";
import { apiGet, apiPost, formatCurrency } from "../../lib/api";
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

  const loadDueCustomers = async () => {
    setLoading(true);
    try {
      const [customerPayload, salesPayload] = await Promise.all([
        apiGet("/api/customers?history_due=true"),
        apiGet("/api/sales?due_history=true"),
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
  }, []);

  const handleFormChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
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
      reference: `Ledger-${customer.id}`,
      max_due: String(due.toFixed(2)),
      amount: String(due.toFixed(2)),
      note: `Ledger due collection for ${customer.name || "customer"}`,
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
        <input
          type="search"
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
          placeholder="Search customer, phone, address, due..."
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
                      <td className="px-3 py-2 capitalize">{payment.sale_source || "ledger"}</td>
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

