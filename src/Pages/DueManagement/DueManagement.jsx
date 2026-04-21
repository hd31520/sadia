import { useEffect, useMemo, useState } from "react";
import SectionPage from "../Shared/SectionPage";
import { apiGet, apiPost, formatCurrency } from "../../lib/api";
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

  const loadDueCustomers = async () => {
    setLoading(true);
    try {
      const [customerPayload, salesPayload] = await Promise.all([
        apiGet("/api/customers?has_due=true"),
        apiGet("/api/sales?due_only=true"),
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

  const getDefaultCollectCustomerId = (preferredCustomerId = "") => {
    if (preferredCustomerId) {
      return String(preferredCustomerId);
    }

    const firstDueCustomer = customers.find((customer) => Number(customer.due_amount || 0) > 0);
    return firstDueCustomer ? String(firstDueCustomer.id) : "";
  };

  const openCollectFromSale = (sale) => {
    const due = Number(sale.due_amount || 0);
    const defaultCustomerId = getDefaultCollectCustomerId(sale.customer_id);
    const defaultCustomer = customers.find((customer) => String(customer.id) === String(defaultCustomerId));
    setCollectError("");
    setCollectForm({
      customer_id: defaultCustomerId,
      sale_id: String(sale.id),
      customer_name: defaultCustomer?.name || sale.customer_name || "Customer",
      reference: sale.invoice_no || `Sale #${sale.id}`,
      max_due: String(due.toFixed(2)),
      amount: String(due.toFixed(2)),
      note: `Due collection for ${sale.invoice_no}`,
    });
    setCollectOpen(true);
  };

  const openCollectFromCustomer = (customer) => {
    const due = Number(customer.due_amount || 0);
    setCollectError("");
    setCollectForm({
      customer_id: getDefaultCollectCustomerId(customer.id),
      sale_id: "",
      customer_name: customer.name || "Customer",
      reference: `Ledger Due - ${customer.name || "Customer"}`,
      max_due: String(due.toFixed(2)),
      amount: String(due.toFixed(2)),
      note: `Ledger due collection for ${customer.name}`,
    });
    setCollectOpen(true);
  };

  const handleCollectChange = (event) => {
    const { name, value } = event.target;
    setCollectForm((prev) => ({ ...prev, [name]: value }));
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

  const printCollectionMemo = async (payment) => {
    const printableHtml = `
      <html>
        <head>
          <title>Due Collection Memo</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 16px; color: #111; }
            .line { border-top: 1px solid #333; margin: 8px 0; }
          </style>
        </head>
        <body>
          <h3 style="margin:0;">Due Collection Memo</h3>
          <div class="line"></div>
          <p><strong>Customer:</strong> ${payment.customer_name || "-"}</p>
          <p><strong>Reference:</strong> ${payment.invoice_no || collectForm.reference || "Ledger"}</p>
          <p><strong>Source:</strong> ${payment.sale_source || "ledger"}</p>
          <p><strong>Collected Amount:</strong> ${formatCurrency(payment.amount || 0)}</p>
          <p><strong>Date:</strong> ${new Date(payment.payment_date || Date.now()).toLocaleString()}</p>
          <p><strong>Note:</strong> ${payment.note || "-"}</p>
        </body>
      </html>
    `;

    const printWindow = window.open("", "_blank", "width=700,height=600");
    if (!printWindow) {
      return;
    }

    printWindow.document.open();
    printWindow.document.write(printableHtml);
    printWindow.document.close();

    setTimeout(() => {
      printWindow.focus();
      printWindow.print();
    }, 100);
  };

  const printDueRowMemo = async (entry) => {
    const printableHtml = `
      <html>
        <head>
          <title>Due Memo</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 16px; color: #111; }
            .line { border-top: 1px solid #333; margin: 8px 0; }
          </style>
        </head>
        <body>
          <h3 style="margin:0;">Due Memo</h3>
          <div class="line"></div>
          <p><strong>Customer:</strong> ${entry.customer_name || entry.name || "-"}</p>
          <p><strong>Reference:</strong> ${entry.invoice_no || "Ledger Due"}</p>
          <p><strong>Source:</strong> ${entry.sale_source || "ledger"}</p>
          <p><strong>Due Amount:</strong> ${formatCurrency(entry.due_amount || 0)}</p>
          <p><strong>Date:</strong> ${entry.sale_date ? new Date(entry.sale_date).toLocaleString() : new Date().toLocaleString()}</p>
        </body>
      </html>
    `;

    const printWindow = window.open("", "_blank", "width=700,height=600");
    if (!printWindow) {
      return;
    }

    printWindow.document.open();
    printWindow.document.write(printableHtml);
    printWindow.document.close();

    setTimeout(() => {
      printWindow.focus();
      printWindow.print();
    }, 100);
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
    const maxDue = customers.reduce((max, customer) => {
      const value = Number(customer.due_amount || 0);
      return value > max ? value : max;
    }, 0);

    return [
      { label: "Due Invoices", value: String(salesDue.length), hint: "Sale + Card due invoices" },
      { label: "Invoice Due Total", value: formatCurrency(totalInvoiceDue), hint: "Outstanding invoice dues" },
      { label: "Customer Ledger Due", value: formatCurrency(totalLedgerDue), hint: "Customer balance due total" },
      { label: "Highest Single Due", value: formatCurrency(maxDue), hint: "Largest exposure on one customer" },
    ];
  }, [customers, salesDue]);

  return (
    <SectionPage
      title="Due Management"
      description="Monitor due balances and payment follow-ups."
      stats={stats}
      loading={loading}
      error={error}
    >
      <div className="mb-4 flex justify-end">
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

      <div className="overflow-x-auto rounded-lg border border-border/60">
        <table className="w-full min-w-full text-sm">
          <thead className="bg-muted/30 text-left">
            <tr>
              <th className="px-3 py-2">Route</th>
              <th className="px-3 py-2">Invoice</th>
              <th className="px-3 py-2">Customer</th>
              <th className="px-3 py-2">Date</th>
              <th className="px-3 py-2">Total</th>
              <th className="px-3 py-2">Paid</th>
              <th className="px-3 py-2">Due</th>
              <th className="px-3 py-2">Action</th>
            </tr>
          </thead>
          <tbody>
            {salesDue.map((sale) => (
              <tr key={sale.id} className="border-t border-border/50">
                <td className="px-3 py-2 uppercase">{sale.sale_source || "sale"}</td>
                <td className="px-3 py-2">{sale.invoice_no}</td>
                <td className="px-3 py-2">{sale.customer_name || "Walk-in"}</td>
                <td className="px-3 py-2">{new Date(sale.sale_date).toLocaleString()}</td>
                <td className="px-3 py-2">{formatCurrency(sale.total_amount)}</td>
                <td className="px-3 py-2">{formatCurrency(sale.paid_amount)}</td>
                <td className="px-3 py-2">{formatCurrency(sale.due_amount)}</td>
                <td className="px-3 py-2">
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => openCollectFromSale(sale)}
                      disabled={Number(sale.due_amount || 0) <= 0}
                      className="rounded-md border border-input px-3 py-1.5 text-xs font-medium hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Collect Due
                    </button>
                    <button
                      type="button"
                      onClick={() => printDueRowMemo(sale)}
                      className="rounded-md border border-input px-3 py-1.5 text-xs font-medium hover:bg-muted"
                    >
                      Print
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {!loading && salesDue.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-3 py-6 text-center text-sm text-muted-foreground">
                  No due invoices found from Sale/Card routes.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <div className="mt-4 overflow-x-auto rounded-lg border border-border/60">
        <table className="w-full min-w-full text-sm">
          <thead className="bg-muted/30 text-left">
            <tr>
              <th className="px-3 py-2">Customer</th>
              <th className="px-3 py-2">Phone</th>
              <th className="px-3 py-2">Address</th>
              <th className="px-3 py-2">Due Date</th>
              <th className="px-3 py-2">Ledger Due Amount</th>
              <th className="px-3 py-2">Action</th>
            </tr>
          </thead>
          <tbody>
            {customers.map((customer) => (
              <tr key={customer.id} className="border-t border-border/50">
                <td className="px-3 py-2">{customer.name}</td>
                <td className="px-3 py-2">{customer.phone || "-"}</td>
                <td className="px-3 py-2">{customer.address || "-"}</td>
                <td className="px-3 py-2">{customer.due_date ? new Date(customer.due_date).toLocaleDateString() : "-"}</td>
                <td className="px-3 py-2">{formatCurrency(customer.due_amount)}</td>
                <td className="px-3 py-2">
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => openCollectFromCustomer(customer)}
                      disabled={Number(customer.due_amount || 0) <= 0}
                      className="rounded-md border border-input px-3 py-1.5 text-xs font-medium hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Collect Due
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
          </tbody>
        </table>
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
    </SectionPage>
  );
}

export default DueManagement;

