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
} from "../../components/ui/dialog";

function Salary() {
  const [workers, setWorkers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [payOpen, setPayOpen] = useState(false);
  const [selectedWorker, setSelectedWorker] = useState(null);
  const [payForm, setPayForm] = useState({ amount: "", note: "" });
  const [payError, setPayError] = useState("");
  const [paySubmitting, setPaySubmitting] = useState(false);

  const refreshWorkers = async () => {
    const workerPayload = await apiGet("/api/users/workers");
    setWorkers(workerPayload || []);
  };

  useEffect(() => {
    let active = true;

    const loadSalaryData = async () => {
      try {
        setLoading(true);
        const workerPayload = await apiGet("/api/users/workers");

        if (active) {
          setWorkers(workerPayload || []);
          setError("");
        }
      } catch (err) {
        if (active) {
          setError(err.message || "Failed to load salary data");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    loadSalaryData();

    return () => {
      active = false;
    };
  }, []);

  const payrollRows = useMemo(
    () =>
      workers.map((worker) => ({
        ...worker,
        workUnits: Number(worker.work_units || 0),
        monthSalary: Number(worker.month_salary || 0),
        salaryPaid: Number(worker.salary_paid || 0),
        salaryDue: Number(worker.salary_due || 0),
      })),
    [workers]
  );

  const stats = useMemo(() => {
    const monthSalaryTotal = payrollRows.reduce((sum, worker) => sum + worker.monthSalary, 0);
    const salaryPaidTotal = payrollRows.reduce((sum, worker) => sum + worker.salaryPaid, 0);
    const salaryDueTotal = payrollRows.reduce((sum, worker) => sum + worker.salaryDue, 0);
    const fullyPaidWorkers = payrollRows.filter((worker) => worker.monthSalary > 0 && worker.salaryDue <= 0).length;

    return [
      { label: "Total Workers", value: String(workers.length), hint: "Registered worker accounts" },
      { label: "Payroll Total", value: formatCurrency(monthSalaryTotal), hint: "Current month salary across all workers" },
      { label: "Salary Paid", value: formatCurrency(salaryPaidTotal), hint: "Payments recorded this month" },
      { label: "Salary Due", value: formatCurrency(salaryDueTotal), hint: "Unpaid current month salary" },
      { label: "Fully Paid", value: String(fullyPaidWorkers), hint: "Workers with no remaining salary due" },
    ];
  }, [payrollRows, workers.length]);

  const printSalaryReceipt = async (payment) => {
    const printableHtml = `
      <html>
        <head>
          <title>Salary Receipt ${payment.receipt_no}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 16px; color: #111; }
            .center { text-align: center; }
            .line { border-top: 1px solid #333; margin: 8px 0; }
            table { width: 100%; border-collapse: collapse; font-size: 12px; }
            td { padding: 4px 0; vertical-align: top; }
          </style>
        </head>
        <body>
          <div class="center">
            <h2 style="margin:0;">Salary Receipt</h2>
            <p style="margin:4px 0;">Receipt No: ${payment.receipt_no}</p>
          </div>
          <div class="line"></div>
          <table>
            <tbody>
              <tr><td><strong>Worker</strong></td><td>${payment.worker_name || "-"}</td></tr>
              <tr><td><strong>Username</strong></td><td>${payment.worker_username || "-"}</td></tr>
              <tr><td><strong>Salary Month</strong></td><td>${payment.salary_month || "-"}</td></tr>
              <tr><td><strong>Payment Date</strong></td><td>${new Date(payment.payment_date || Date.now()).toLocaleString()}</td></tr>
              <tr><td><strong>Daily Salary</strong></td><td>${formatCurrency(payment.daily_salary || 0)}</td></tr>
              <tr><td><strong>Work Units</strong></td><td>${Number(payment.work_units || 0).toFixed(1)}</td></tr>
              <tr><td><strong>Month Salary</strong></td><td>${formatCurrency(payment.month_salary || 0)}</td></tr>
              <tr><td><strong>Paid Before</strong></td><td>${formatCurrency(payment.salary_paid_before || 0)}</td></tr>
              <tr><td><strong>Paid Now</strong></td><td>${formatCurrency(payment.amount || 0)}</td></tr>
              <tr><td><strong>Total Paid</strong></td><td>${formatCurrency(payment.salary_paid_after || 0)}</td></tr>
              <tr><td><strong>Due After</strong></td><td>${formatCurrency(payment.salary_due_after || 0)}</td></tr>
              <tr><td><strong>Note</strong></td><td>${payment.note || "-"}</td></tr>
            </tbody>
          </table>
        </body>
      </html>
    `;

    const printWindow = window.open("", "_blank", "width=720,height=720");
    if (!printWindow) {
      return;
    }

    printWindow.document.open();
    printWindow.document.write(printableHtml);
    printWindow.document.close();

    setTimeout(() => {
      printWindow.focus();
      printWindow.print();
    }, 120);
  };

  const openPayDialog = (worker) => {
    setSelectedWorker(worker);
    setPayForm({ amount: String(worker.salaryDue || 0), note: "" });
    setPayError("");
    setPayOpen(true);
  };

  const handlePaySalary = async (event) => {
    event.preventDefault();

    if (!selectedWorker) {
      return;
    }

    const parsedAmount = Number(payForm.amount || 0);
    if (Number.isNaN(parsedAmount) || parsedAmount <= 0) {
      setPayError("Enter a valid salary amount.");
      return;
    }

    if (parsedAmount > Number(selectedWorker.salaryDue || 0)) {
      setPayError("Salary amount cannot exceed the remaining due amount.");
      return;
    }

    try {
      setPaySubmitting(true);
      const payload = await apiPost("/api/salary-payments", {
        worker_id: Number(selectedWorker.id),
        amount: parsedAmount,
        note: payForm.note.trim() || null,
        salary_month: selectedWorker.salary_month,
      });

      await printSalaryReceipt(payload.payment);
      await refreshWorkers();
      setPayOpen(false);
      setSelectedWorker(null);
    } catch (err) {
      setPayError(err.message || "Failed to pay salary");
    } finally {
      setPaySubmitting(false);
    }
  };

  return (
    <SectionPage
      title="Salary"
      description="Review each worker daily and monthly salary, due amount, and pay with receipt."
      stats={stats}
      loading={loading}
      error={error}
    >
      <div className="space-y-4">
        <Dialog open={payOpen} onOpenChange={setPayOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Pay Salary</DialogTitle>
              <DialogDescription>
                {selectedWorker ? `Pay salary for ${selectedWorker.name}.` : "Select a worker to pay salary."}
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handlePaySalary} className="space-y-3">
              <div className="rounded-md border border-border/60 bg-muted/20 p-3 text-sm">
                <p className="font-medium text-foreground">{selectedWorker?.name || "Worker"}</p>
                <p className="text-xs text-muted-foreground">Month due: {formatCurrency(selectedWorker?.salaryDue || 0)}</p>
              </div>

              <label className="block text-xs text-muted-foreground">
                Amount
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={payForm.amount}
                  onChange={(event) => setPayForm((prev) => ({ ...prev, amount: event.target.value }))}
                  className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
                />
              </label>

              <label className="block text-xs text-muted-foreground">
                Note
                <textarea
                  value={payForm.note}
                  onChange={(event) => setPayForm((prev) => ({ ...prev, note: event.target.value }))}
                  className="mt-1 min-h-20 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
                  placeholder="Optional note"
                />
              </label>

              {payError ? <p className="text-sm text-destructive">{payError}</p> : null}

              <DialogFooter>
                <button
                  type="button"
                  onClick={() => setPayOpen(false)}
                  className="rounded-md border border-input px-4 py-2 text-sm font-medium text-foreground hover:bg-muted"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={paySubmitting}
                  className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60"
                >
                  {paySubmitting ? "Paying..." : "Pay Salary"}
                </button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        <div className="rounded-lg border border-border/60">
          <div className="hidden md:block">
            <table className="w-full table-fixed text-sm">
              <thead className="bg-muted/30 text-left">
                <tr>
                  <th className="w-[16%] px-3 py-2">Worker</th>
                  <th className="w-[10%] px-3 py-2">Daily Salary</th>
                  <th className="w-[10%] px-3 py-2">Monthly Salary</th>
                  <th className="w-[8%] px-3 py-2">Present</th>
                  <th className="w-[8%] px-3 py-2">Half Day</th>
                  <th className="w-[8%] px-3 py-2">Weekend</th>
                  <th className="w-[10%] px-3 py-2">Half Weekend</th>
                  <th className="w-[8%] px-3 py-2">Work Units</th>
                  <th className="w-[10%] px-3 py-2">Paid</th>
                  <th className="w-[10%] px-3 py-2">Due</th>
                  <th className="w-[12%] px-3 py-2">Action</th>
                </tr>
              </thead>
              <tbody>
                {payrollRows.map((worker) => (
                  <tr key={worker.id} className="border-t border-border/50 align-top">
                    <td className="px-3 py-2">
                      <span className="block truncate font-medium text-foreground">{worker.name}</span>
                      <span className="block truncate text-xs text-muted-foreground">{worker.username}</span>
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">{formatCurrency(worker.daily_salary)}</td>
                    <td className="px-3 py-2 whitespace-nowrap font-medium">{formatCurrency(Number(worker.daily_salary || 0) * 30)}</td>
                    <td className="px-3 py-2 whitespace-nowrap">{worker.present_count}</td>
                    <td className="px-3 py-2 whitespace-nowrap">{worker.half_day_count || 0}</td>
                    <td className="px-3 py-2 whitespace-nowrap">{worker.weekend_count || 0}</td>
                    <td className="px-3 py-2 whitespace-nowrap">{worker.half_weekend_count || 0}</td>
                    <td className="px-3 py-2 whitespace-nowrap">{Number(worker.workUnits || 0).toFixed(1)}</td>
                    <td className="px-3 py-2 whitespace-nowrap">{formatCurrency(worker.salaryPaid)}</td>
                    <td className="px-3 py-2 whitespace-nowrap">{formatCurrency(worker.salaryDue)}</td>
                    <td className="px-3 py-2">
                      <button
                        type="button"
                        onClick={() => openPayDialog(worker)}
                        disabled={worker.salaryDue <= 0}
                        className="rounded-md border border-input px-3 py-2 text-xs font-medium hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {worker.salaryDue > 0 ? "Pay Salary" : "Paid"}
                      </button>
                    </td>
                  </tr>
                ))}
                {!payrollRows.length ? (
                  <tr>
                    <td colSpan={11} className="px-3 py-6 text-center text-sm text-muted-foreground">
                      No workers found.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>

          <div className="space-y-3 p-3 md:hidden">
            {payrollRows.map((worker) => (
              <div key={worker.id} className="rounded-lg border border-border/60 bg-card p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-foreground">{worker.name}</p>
                    <p className="text-xs text-muted-foreground">{worker.username}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => openPayDialog(worker)}
                    disabled={worker.salaryDue <= 0}
                    className="rounded-md border border-input px-3 py-2 text-xs font-medium hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {worker.salaryDue > 0 ? "Pay Salary" : "Paid"}
                  </button>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                  <div className="rounded-md bg-muted/40 p-2">
                    <span className="block text-[11px] uppercase">Daily Salary</span>
                    <span className="text-sm text-foreground">{formatCurrency(worker.daily_salary)}</span>
                  </div>
                  <div className="rounded-md bg-muted/40 p-2">
                    <span className="block text-[11px] uppercase">Monthly Salary</span>
                    <span className="text-sm text-foreground">{formatCurrency(Number(worker.daily_salary || 0) * 30)}</span>
                  </div>
                  <div className="rounded-md bg-muted/40 p-2">
                    <span className="block text-[11px] uppercase">Work Units</span>
                    <span className="text-sm text-foreground">{Number(worker.workUnits || 0).toFixed(1)}</span>
                  </div>
                  <div className="rounded-md bg-muted/40 p-2">
                    <span className="block text-[11px] uppercase">Paid / Due</span>
                    <span className="text-sm text-foreground">{formatCurrency(worker.salaryPaid)} / {formatCurrency(worker.salaryDue)}</span>
                  </div>
                </div>
              </div>
            ))}

            {!payrollRows.length ? (
              <p className="py-6 text-center text-sm text-muted-foreground">No workers found.</p>
            ) : null}
          </div>
        </div>
      </div>
    </SectionPage>
  );
}

export default Salary;

