import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import SalesTrendChart from "./SalesTrendChart";
import SectionPage from "../Shared/SectionPage";
import { apiGet, formatCurrency } from "../../lib/api";
import { buildDateRangeQuery, getDateRangePreset } from "../../lib/dateRange";

function Dashboard() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [rangeLoading, setRangeLoading] = useState(false);
  const [error, setError] = useState("");
  const [period, setPeriod] = useState("daily");
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");

  const rangeQuery = useMemo(
    () => buildDateRangeQuery(period, customStartDate, customEndDate),
    [period, customStartDate, customEndDate]
  );

  useEffect(() => {
    let active = true;

    const fetchDashboard = async () => {
      try {
        setRangeLoading(true);
        const params = new URLSearchParams();
        if (rangeQuery.start_date) params.set("start_date", rangeQuery.start_date);
        if (rangeQuery.end_date) params.set("end_date", rangeQuery.end_date);

        const payload = await apiGet(`/api/reports/dashboard${params.toString() ? `?${params.toString()}` : ""}`);
        if (active) {
          setData(payload);
          setError("");
        }
      } catch (err) {
        if (active) {
          setError(err.message || "Failed to load dashboard");
        }
      } finally {
        if (active) {
          setLoading(false);
          setRangeLoading(false);
        }
      }
    };

    fetchDashboard();

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

  const stats = useMemo(
    () => [
      {
        label: `Sales (${rangeLabel})`,
        value: formatCurrency(data?.today_sales?.total),
        hint: `Paid ${formatCurrency(data?.today_sales?.paid)} | Due ${formatCurrency(data?.today_sales?.due)}`,
      },
      {
        label: "Products",
        value: String(data?.products?.total || 0),
        hint: `${data?.products?.low_stock || 0} low stock items`,
      },
      {
        label: "Customers / Due",
        value: `${data?.customers?.total || 0} / ${formatCurrency(data?.due?.total)}`,
        hint: "Total customer count and outstanding due",
      },
      {
        label: `Profit (${rangeLabel})`,
        value: formatCurrency(data?.period_profit?.total),
        hint: "Profit from sold items in the selected period",
      },
    ],
    [data, rangeLabel]
  );

  const quickLinks = [
    { label: "New Sale", hint: "Create invoice", path: "/sale" },
    { label: "Cart", hint: "Fast counter flow", path: "/cart" },
    { label: "Products", hint: "Manage catalog", path: "/product" },
    { label: "Reports", hint: "Export insights", path: "/report" },
  ];

  const operationalHighlights = useMemo(() => {
    const recentSales = data?.recent_sales || [];
    const highestSale = recentSales.reduce((max, sale) => {
      const total = Number(sale.total_amount || 0);
      return total > Number(max?.total_amount || 0) ? sale : max;
    }, null);

    return [
      {
        label: "Recent Invoices",
        value: String(recentSales.length),
        hint: "Latest transactions loaded",
      },
      {
        label: "Largest Invoice",
        value: highestSale ? formatCurrency(highestSale.total_amount) : formatCurrency(0),
        hint: highestSale?.invoice_no || "No invoices yet",
      },
      {
        label: "Customer Due",
        value: formatCurrency(data?.due?.total || 0),
        hint: "Outstanding customer ledger",
      },
    ];
  }, [data]);

  return (
    <SectionPage
      title="Dashboard"
      description="Overview of sales, inventory, and business health."
      stats={stats}
      loading={loading || rangeLoading}
      error={error}
    >
      <div className="space-y-3">
        <div className="grid gap-3 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-2xl border border-border/60 bg-card p-4 shadow-[0_12px_35px_rgba(15,23,42,0.06)]">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Quick Actions</p>
                <h3 className="mt-1 text-lg font-semibold text-foreground">Move Faster</h3>
              </div>
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="rounded-md border border-input px-3 py-2 text-xs font-medium hover:bg-muted"
              >
                Reload App
              </button>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {quickLinks.map((item) => (
                <button
                  key={item.path}
                  type="button"
                  onClick={() => navigate(item.path)}
                  className="rounded-2xl border border-border/60 bg-[linear-gradient(135deg,rgba(255,255,255,0.9),rgba(241,245,249,0.72))] px-4 py-4 text-left transition hover:-translate-y-0.5 hover:border-primary/35 hover:shadow-[0_16px_30px_rgba(37,99,235,0.12)] dark:bg-[linear-gradient(135deg,rgba(30,41,59,0.95),rgba(15,23,42,0.92))]"
                >
                  <p className="text-sm font-semibold text-foreground">{item.label}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{item.hint}</p>
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-border/60 bg-card p-4 shadow-[0_12px_35px_rgba(15,23,42,0.06)]">
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Operational Pulse</p>
            <div className="mt-4 space-y-3">
              {operationalHighlights.map((item) => (
                <div key={item.label} className="rounded-2xl border border-border/60 bg-muted/20 px-4 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm text-muted-foreground">{item.label}</span>
                    <span className="text-lg font-semibold text-foreground">{item.value}</span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">{item.hint}</p>
                </div>
              ))}
            </div>
          </div>
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

        {/* Sales Trend Chart */}
        {data?.sales_trend && data.sales_trend.length > 0 && (
          <div className="rounded-lg border border-border/60 bg-card p-3">
            <h3 className="mb-2 text-sm font-medium text-foreground">Sales Trend</h3>
            <SalesTrendChart data={data.sales_trend} />
          </div>
        )}

        <h3 className="text-sm font-medium text-foreground">Recent Sales</h3>
        <div className="overflow-x-auto rounded-lg border border-border/60">
          <table className="w-full min-w-[40rem] text-sm">
            <thead className="bg-muted/30 text-left">
              <tr>
                <th className="px-3 py-2">Invoice</th>
                <th className="px-3 py-2">Customer</th>
                <th className="px-3 py-2">Total</th>
                <th className="px-3 py-2">Paid</th>
                <th className="px-3 py-2">Due</th>
              </tr>
            </thead>
            <tbody>
              {(data?.recent_sales || []).map((sale) => (
                <tr key={sale.id} className="border-t border-border/50">
                  <td className="px-3 py-2">{sale.invoice_no}</td>
                  <td className="px-3 py-2">{sale.customer_name || "Walk-in"}</td>
                  <td className="px-3 py-2">{formatCurrency(sale.total_amount)}</td>
                  <td className="px-3 py-2">{formatCurrency(sale.paid_amount)}</td>
                  <td className="px-3 py-2">{formatCurrency(sale.due_amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </SectionPage>
  );
}

export default Dashboard;

