import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router";
import SectionPage from "../Shared/SectionPage";
import { apiGet, formatCurrency } from "../../lib/api";

const weekdayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const statusStyles = {
  present: "bg-emerald-500/10 text-emerald-700 border-emerald-500/20",
  late: "bg-sky-500/10 text-sky-700 border-sky-500/20",
  absent: "bg-rose-500/10 text-rose-700 border-rose-500/20",
  half_day: "bg-amber-500/10 text-amber-700 border-amber-500/20",
  weekend: "bg-violet-500/10 text-violet-700 border-violet-500/20",
  half_weekend: "bg-fuchsia-500/10 text-fuchsia-700 border-fuchsia-500/20",
};

const statusLabels = {
  present: "Present",
  late: "Late",
  absent: "Absent",
  half_day: "Half Day",
  weekend: "Weekend",
  half_weekend: "Half Weekend",
};

function WorkerAttendanceHistory() {
  const navigate = useNavigate();
  const { workerId } = useParams();
  const [month, setMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [payload, setPayload] = useState(null);
  const [salaryPayments, setSalaryPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    const loadHistory = async () => {
      try {
        setLoading(true);
        const [calendarPayload, paymentPayload] = await Promise.all([
          apiGet(`/api/attendance/calendar?user_id=${workerId}&month=${month}`),
          apiGet(`/api/salary-payments?worker_id=${workerId}`),
        ]);

        if (!active) {
          return;
        }

        setPayload(calendarPayload || null);
        setSalaryPayments(paymentPayload || []);
        setError("");
      } catch (err) {
        if (active) {
          setError(err.message || "Failed to load worker history");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    loadHistory();

    return () => {
      active = false;
    };
  }, [month, workerId]);

  const recordMap = useMemo(() => {
    const map = new Map();
    (payload?.records || []).forEach((record) => {
      map.set(String(record.date), record);
    });
    return map;
  }, [payload?.records]);

  const calendarCells = useMemo(() => {
    const [year, monthNumber] = month.split("-").map(Number);
    const firstDay = new Date(year, monthNumber - 1, 1);
    const daysInMonth = new Date(year, monthNumber, 0).getDate();
    const cells = [];

    for (let index = 0; index < firstDay.getDay(); index += 1) {
      cells.push({ type: "empty", key: `empty-${index}` });
    }

    for (let day = 1; day <= daysInMonth; day += 1) {
      const dateKey = `${month}-${String(day).padStart(2, "0")}`;
      const record = recordMap.get(dateKey);
      cells.push({
        type: "day",
        key: dateKey,
        date: dateKey,
        day,
        status: record?.status || "absent",
        record,
      });
    }

    return cells;
  }, [month, recordMap]);

  const summary = useMemo(() => payload?.summary || {}, [payload?.summary]);
  const worker = payload?.worker || {};

  const stats = useMemo(
    () => [
      { label: "Present", value: String(summary.present_count || 0), hint: "Present and late for this month" },
      { label: "Half Day", value: String(summary.half_day_count || 0), hint: "Half-day attendance count" },
      { label: "Weekend", value: String(summary.weekend_count || 0), hint: "Weekend attendance count" },
      { label: "Absent", value: String(summary.absent_count || 0), hint: "Absent days in this month" },
      { label: "Work Units", value: String(Number(summary.work_units || 0).toFixed(1)), hint: "Full-day equivalent attendance" },
      { label: "Month Salary", value: formatCurrency(summary.month_salary || 0), hint: "Salary earned from attendance" },
    ],
    [summary]
  );

  return (
    <SectionPage
      title="Worker Attendance History"
      description="Review one worker attendance in a monthly calendar and salary payment timeline."
      stats={stats}
      loading={loading}
      error={error}
    >
      <div className="space-y-4">
        <div className="flex flex-col gap-3 rounded-lg border border-border/60 bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-lg font-semibold text-foreground">{worker.name || "Worker"}</p>
            <p className="text-sm text-muted-foreground">
              {worker.username || "-"} · Daily Salary {formatCurrency(worker.daily_salary || 0)}
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <input
              type="month"
              value={month}
              onChange={(event) => setMonth(event.target.value)}
              className="rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
            />
            <button
              type="button"
              onClick={() => navigate("/worker")}
              className="rounded-md border border-input px-4 py-2 text-sm font-medium text-foreground hover:bg-muted"
            >
              Back
            </button>
          </div>
        </div>

        <div className="rounded-lg border border-border/60 bg-card p-4">
          <div className="grid grid-cols-7 gap-2">
            {weekdayLabels.map((label) => (
              <div key={label} className="rounded-md bg-muted/40 px-2 py-2 text-center text-xs font-semibold uppercase text-muted-foreground">
                {label}
              </div>
            ))}
            {calendarCells.map((cell) =>
              cell.type === "empty" ? (
                <div key={cell.key} className="min-h-26 rounded-md border border-dashed border-border/50 bg-muted/15" />
              ) : (
                <div
                  key={cell.key}
                  className={`min-h-26 rounded-md border p-2 text-xs ${statusStyles[cell.status] || statusStyles.absent}`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold">{cell.day}</span>
                    <span className="rounded-full bg-background/70 px-2 py-0.5 text-[10px] font-medium">
                      {statusLabels[cell.status] || cell.status}
                    </span>
                  </div>
                  <p className="mt-3 text-[11px] text-current/80">
                    {cell.record?.check_in_time ? `In: ${cell.record.check_in_time}` : "No check-in"}
                  </p>
                  <p className="mt-1 text-[11px] text-current/80">
                    {cell.record?.check_out_time ? `Out: ${cell.record.check_out_time}` : "No check-out"}
                  </p>
                </div>
              )
            )}
          </div>
        </div>

        <div className="rounded-lg border border-border/60">
          <div className="border-b border-border/60 px-4 py-3">
            <h2 className="text-sm font-semibold text-foreground">Salary Payment History</h2>
            <p className="text-xs text-muted-foreground">All salary payments for this worker</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full table-fixed text-sm">
              <thead className="bg-muted/30 text-left">
                <tr>
                  <th className="w-[16%] px-3 py-2">Month</th>
                  <th className="w-[14%] px-3 py-2">Amount</th>
                  <th className="w-[22%] px-3 py-2">Payment Date</th>
                  <th className="w-[18%] px-3 py-2">Created By</th>
                  <th className="w-[30%] px-3 py-2">Note</th>
                </tr>
              </thead>
              <tbody>
                {salaryPayments.map((payment) => (
                  <tr key={payment.id} className="border-t border-border/50">
                    <td className="px-3 py-2">{payment.salary_month}</td>
                    <td className="px-3 py-2">{formatCurrency(payment.amount)}</td>
                    <td className="px-3 py-2">{new Date(payment.payment_date).toLocaleString()}</td>
                    <td className="px-3 py-2">{payment.created_by_name || "-"}</td>
                    <td className="px-3 py-2">{payment.note || "-"}</td>
                  </tr>
                ))}
                {!salaryPayments.length ? (
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
    </SectionPage>
  );
}

export default WorkerAttendanceHistory;
