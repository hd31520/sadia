import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";
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
  const navigate = useNavigate();
  const [workers, setWorkers] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [payOpen, setPayOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [selectedWorker, setSelectedWorker] = useState(null);
  const [payForm, setPayForm] = useState({ amount: "", note: "" });
  const [payError, setPayError] = useState("");
  const [paySubmitting, setPaySubmitting] = useState(false);
  const [historyMonth, setHistoryMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [historyYear, setHistoryYear] = useState(() => String(new Date().getFullYear()));
  const [monthlyAttendanceRows, setMonthlyAttendanceRows] = useState([]);
  const [yearlyAttendanceRows, setYearlyAttendanceRows] = useState([]);
  const [salaryPayments, setSalaryPayments] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState("");

  const refreshWorkers = async () => {
    const workerPayload = await apiGet("/api/users/workers");
    setWorkers(workerPayload || []);
  };

  const refreshSalaryHistory = useCallback(async () => {
    try {
      setHistoryLoading(true);
      const [monthlyPayload, yearlyPayload, paymentsPayload] = await Promise.all([
        apiGet(`/api/attendance/monthly-summary?month=${historyMonth}`),
        apiGet(`/api/attendance/yearly-summary?year=${historyYear}`),
        apiGet("/api/salary-payments"),
      ]);
      setMonthlyAttendanceRows(monthlyPayload?.rows || []);
      setYearlyAttendanceRows(yearlyPayload?.rows || []);
      setSalaryPayments(paymentsPayload || []);
      setHistoryError("");
    } catch (err) {
      setHistoryError(err.message || "Failed to load salary history");
    } finally {
      setHistoryLoading(false);
    }
  }, [historyMonth, historyYear]);

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

  useEffect(() => {
    refreshSalaryHistory();
  }, [refreshSalaryHistory]);

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

  const filteredPayrollRows = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) {
      return payrollRows;
    }

    return payrollRows.filter((worker) => {
      const searchableValues = [
        worker.name,
        worker.username,
        String(worker.daily_salary ?? ""),
        String(worker.monthSalary ?? ""),
        String(worker.salaryPaid ?? ""),
        String(worker.salaryDue ?? ""),
        String(worker.workUnits ?? ""),
      ];

      return searchableValues.some((value) => String(value || "").toLowerCase().includes(query));
    });
  }, [payrollRows, searchTerm]);

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

  const openHistoryDialog = (worker) => {
    setSelectedWorker(worker);
    setHistoryOpen(true);
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
      await refreshSalaryHistory();
      setPayOpen(false);
      setSelectedWorker(null);
    } catch (err) {
      setPayError(err.message || "Failed to pay salary");
    } finally {
      setPaySubmitting(false);
    }
  };

  const selectedMonthlyAttendance = useMemo(
    () => monthlyAttendanceRows.find((row) => Number(row.id) === Number(selectedWorker?.id || 0)) || null,
    [monthlyAttendanceRows, selectedWorker?.id]
  );

  const selectedYearlyAttendance = useMemo(
    () => yearlyAttendanceRows.find((row) => Number(row.id) === Number(selectedWorker?.id || 0)) || null,
    [yearlyAttendanceRows, selectedWorker?.id]
  );

  const selectedSalaryPayments = useMemo(
    () => salaryPayments.filter((payment) => Number(payment.worker_id) === Number(selectedWorker?.id || 0)),
    [salaryPayments, selectedWorker?.id]
  );

  return (
    <SectionPage
      title="Salary"
      description="Review payroll, salary payment history, and attendance history from one page."
      stats={stats}
      loading={loading}
      error={error}
    >
      <div className="space-y-4">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <input
            type="search"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Search worker, username, paid, due..."
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground xl:max-w-sm"
          />
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            <input
              type="month"
              value={historyMonth}
              onChange={(event) => setHistoryMonth(event.target.value)}
              className="rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
            />
            <input
              type="number"
              min="2000"
              max="3000"
              value={historyYear}
              onChange={(event) => setHistoryYear(event.target.value)}
              className="rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground sm:w-32"
            />
          </div>
        </div>

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

        <Dialog open={historyOpen} onOpenChange={setHistoryOpen}>
          <DialogContent className="sm:max-w-4xl">
            <DialogHeader>
              <DialogTitle>Worker Salary History</DialogTitle>
              <DialogDescription>
                {selectedWorker ? `Attendance and salary history for ${selectedWorker.name}.` : "Select a worker."}
              </DialogDescription>
            </DialogHeader>

            {historyError ? <p className="text-sm text-destructive">{historyError}</p> : null}

            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-md border border-border/60 bg-muted/20 p-3">
                  <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Attendance Days</p>
                  <p className="mt-2 text-lg font-semibold text-foreground">
                    {Number(selectedMonthlyAttendance?.attendance_days || 0).toFixed(1)}
                  </p>
                </div>
                <div className="rounded-md border border-border/60 bg-muted/20 p-3">
                  <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Month Salary</p>
                  <p className="mt-2 text-lg font-semibold text-foreground">
                    {formatCurrency(selectedMonthlyAttendance?.month_salary || 0)}
                  </p>
                </div>
                <div className="rounded-md border border-border/60 bg-muted/20 p-3">
                  <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Salary Paid</p>
                  <p className="mt-2 text-lg font-semibold text-foreground">
                    {formatCurrency(selectedMonthlyAttendance?.salary_paid || 0)}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => navigate(`/worker/${selectedWorker?.id}/history`)}
                  className="rounded-md border border-input px-4 py-2 text-sm font-medium text-foreground hover:bg-muted"
                >
                  Open Calendar Page
                </button>
              </div>

              <div className="rounded-lg border border-border/60">
                <div className="border-b border-border/60 px-4 py-3">
                  <h3 className="text-sm font-semibold text-foreground">Yearly Attendance Days</h3>
                </div>
                <div className="grid gap-2 p-4 sm:grid-cols-3 lg:grid-cols-4">
                  {(selectedYearlyAttendance?.months || []).map((monthRow) => (
                    <div key={monthRow.month} className="rounded-md border border-border/60 bg-card p-3">
                      <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{monthRow.month}</p>
                      <p className="mt-2 text-base font-semibold text-foreground">
                        {Number(monthRow.attendance_days || 0).toFixed(1)} days
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-lg border border-border/60">
                <div className="border-b border-border/60 px-4 py-3">
                  <h3 className="text-sm font-semibold text-foreground">Salary Payment History</h3>
                </div>
                <div className="max-h-72 overflow-auto">
                  <table className="w-full table-fixed text-sm">
                    <thead className="bg-muted/30 text-left">
                      <tr>
                        <th className="w-[18%] px-3 py-2">Month</th>
                        <th className="w-[16%] px-3 py-2">Amount</th>
                        <th className="w-[26%] px-3 py-2">Payment Date</th>
                        <th className="w-[18%] px-3 py-2">Created By</th>
                        <th className="w-[22%] px-3 py-2">Note</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedSalaryPayments.map((payment) => (
                        <tr key={payment.id} className="border-t border-border/50">
                          <td className="px-3 py-2">{payment.salary_month}</td>
                          <td className="px-3 py-2">{formatCurrency(payment.amount)}</td>
                          <td className="px-3 py-2">{new Date(payment.payment_date).toLocaleString()}</td>
                          <td className="px-3 py-2">{payment.created_by_name || "-"}</td>
                          <td className="px-3 py-2">{payment.note || "-"}</td>
                        </tr>
                      ))}
                      {!selectedSalaryPayments.length ? (
                        <tr>
                          <td colSpan={5} className="px-3 py-6 text-center text-sm text-muted-foreground">
                            No salary payment history found.
                          </td>
                        </tr>
                      ) : null}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
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
                {filteredPayrollRows.map((worker) => (
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
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => openHistoryDialog(worker)}
                          className="rounded-md border border-input px-3 py-2 text-xs font-medium hover:bg-muted"
                        >
                          History
                        </button>
                        <button
                          type="button"
                          onClick={() => openPayDialog(worker)}
                          disabled={worker.salaryDue <= 0}
                          className="rounded-md border border-input px-3 py-2 text-xs font-medium hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {worker.salaryDue > 0 ? "Pay Salary" : "Paid"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {!filteredPayrollRows.length ? (
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
            {filteredPayrollRows.map((worker) => (
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

                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => openHistoryDialog(worker)}
                    className="rounded-md border border-input px-3 py-2 text-xs font-medium hover:bg-muted"
                  >
                    History
                  </button>
                </div>
              </div>
            ))}

            {!filteredPayrollRows.length ? (
              <p className="py-6 text-center text-sm text-muted-foreground">No workers found.</p>
            ) : null}
          </div>
        </div>

        <div className="rounded-lg border border-border/60">
          <div className="border-b border-border/60 px-4 py-3">
            <h2 className="text-sm font-semibold text-foreground">Monthly Attendance History</h2>
            <p className="text-xs text-muted-foreground">Attendance history used for salary context in {historyMonth}</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full table-fixed text-sm">
              <thead className="bg-muted/30 text-left">
                <tr>
                  <th className="w-[20%] px-3 py-2">Worker</th>
                  <th className="w-[12%] px-3 py-2">Present</th>
                  <th className="w-[12%] px-3 py-2">Half Day</th>
                  <th className="w-[12%] px-3 py-2">Weekend</th>
                  <th className="w-[12%] px-3 py-2">Absent</th>
                  <th className="w-[12%] px-3 py-2">Days</th>
                  <th className="w-[20%] px-3 py-2">Salary Paid</th>
                </tr>
              </thead>
              <tbody>
                {monthlyAttendanceRows.map((worker) => (
                  <tr key={worker.id} className="border-t border-border/50">
                    <td className="px-3 py-2">
                      <span className="block truncate font-medium text-foreground">{worker.name}</span>
                      <span className="block truncate text-xs text-muted-foreground">{worker.username}</span>
                    </td>
                    <td className="px-3 py-2">{worker.present_count}</td>
                    <td className="px-3 py-2">{worker.half_day_count}</td>
                    <td className="px-3 py-2">{worker.weekend_count}</td>
                    <td className="px-3 py-2">{worker.absent_count}</td>
                    <td className="px-3 py-2">{Number(worker.attendance_days || 0).toFixed(1)}</td>
                    <td className="px-3 py-2">{formatCurrency(worker.salary_paid || 0)}</td>
                  </tr>
                ))}
                {!historyLoading && !monthlyAttendanceRows.length ? (
                  <tr>
                    <td colSpan={7} className="px-3 py-6 text-center text-sm text-muted-foreground">
                      No monthly attendance history found.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </SectionPage>
  );
}

export default Salary;
