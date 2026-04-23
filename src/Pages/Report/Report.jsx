import { useEffect, useMemo, useState } from "react";
import SectionPage from "../Shared/SectionPage";
import { apiDownload, apiGet } from "../../lib/api";
import { buildDateRangeQuery, getDateRangePreset } from "../../lib/dateRange";

const periods = [
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
  { value: "yearly", label: "Yearly" },
  { value: "custom", label: "Custom" },
  { value: "all", label: "All Time" },
];

const formatAmount = (value) =>
  `Tk ${new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value || 0))}`;

const escapeCsvValue = (value) => `"${String(value ?? "").replace(/"/g, '""')}"`;

const normalizeReport = (report) => ({
  products: {
    total: Number(report?.products?.total || 0),
    low_stock: Number(report?.products?.low_stock || 0),
  },
  customers: {
    total: Number(report?.customers?.total || 0),
  },
  due: {
    total: Number(report?.due?.total || 0),
  },
  today_sales: {
    total: Number(report?.today_sales?.total || 0),
    paid: Number(report?.today_sales?.paid || 0),
    due: Number(report?.today_sales?.due || 0),
  },
  period_profit: {
    total: Number(report?.period_profit?.total || 0),
  },
  recent_sales: Array.isArray(report?.recent_sales) ? report.recent_sales : [],
  sales_trend: Array.isArray(report?.sales_trend) ? report.sales_trend : [],
  range: {
    start_date: report?.range?.start_date || "",
    end_date: report?.range?.end_date || "",
  },
});

const buildReportCsv = (report) => {
  const summaryRows = [
    ["Metric", "Value"],
    ["Range Start", report.range.start_date],
    ["Range End", report.range.end_date],
    ["Total Sales", report.today_sales.total],
    ["Paid", report.today_sales.paid],
    ["Due", report.today_sales.due],
    ["Profit", report.period_profit.total],
    ["Products", report.products.total],
    ["Low Stock", report.products.low_stock],
    ["Customers", report.customers.total],
    ["Customer Due Total", report.due.total],
  ];

  const trendRows = [
    [],
    ["Sales Trend"],
    ["Date", "Total", "Paid", "Due", "Transactions"],
    ...report.sales_trend.map((point) => [
      point.label,
      point.total,
      point.paid,
      point.due,
      point.transactions,
    ]),
  ];

  const recentRows = [
    [],
    ["Recent Sales"],
    ["Date", "Invoice", "Customer", "Total", "Paid", "Due"],
    ...report.recent_sales.map((sale) => [
      sale.sale_date?.slice(0, 10) || "",
      sale.invoice_no || "",
      sale.customer_name || "Walk-in",
      sale.total_amount || 0,
      sale.paid_amount || 0,
      sale.due_amount || 0,
    ]),
  ];

  return [...summaryRows, ...trendRows, ...recentRows]
    .map((row) => row.map(escapeCsvValue).join(","))
    .join("\n");
};

const buildExcelData = (report) => {
  const summary = [
    ["Metric", "Value"],
    ["Range Start", report.range.start_date],
    ["Range End", report.range.end_date],
    ["Total Sales", report.today_sales.total],
    ["Paid", report.today_sales.paid],
    ["Due", report.today_sales.due],
    ["Profit", report.period_profit.total],
    ["Products", report.products.total],
    ["Low Stock", report.products.low_stock],
    ["Customers", report.customers.total],
    ["Customer Due Total", report.due.total],
  ];

  const trend = [
    ["Date", "Total", "Paid", "Due", "Transactions"],
    ...report.sales_trend.map((point) => [
      point.label,
      point.total,
      point.paid,
      point.due,
      point.transactions,
    ]),
  ];

  const recent = [
    ["Date", "Invoice", "Customer", "Total", "Paid", "Due"],
    ...report.recent_sales.map((sale) => [
      sale.sale_date?.slice(0, 10) || "",
      sale.invoice_no || "",
      sale.customer_name || "Walk-in",
      sale.total_amount || 0,
      sale.paid_amount || 0,
      sale.due_amount || 0,
    ]),
  ];

  return { summary, trend, recent };
};

const downloadBlob = (content, filename, mimeType) => {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
};

const downloadExcel = async (report, filename) => {
  const XLSX = await import("xlsx");
  const { summary, trend, recent } = buildExcelData(report);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(summary), "Summary");
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(trend), "Sales Trend");
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(recent), "Recent Sales");
  XLSX.writeFile(workbook, filename);
};

const downloadPdf = async (report, filename) => {
  const [{ jsPDF }, { default: autoTable }] = await Promise.all([
    import("jspdf"),
    import("jspdf-autotable"),
  ]);
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const rangeLabel = `${report.range.start_date || "-"} to ${report.range.end_date || "-"}`;

  doc.setFontSize(18);
  doc.text("Sales Report", 40, 40);
  doc.setFontSize(10);
  doc.setTextColor(90);
  doc.text(`Range: ${rangeLabel}`, 40, 58);

  autoTable(doc, {
    startY: 78,
    head: [["Metric", "Value"]],
    body: [
      ["Total Sales", formatAmount(report.today_sales.total)],
      ["Paid", formatAmount(report.today_sales.paid)],
      ["Due", formatAmount(report.today_sales.due)],
      ["Profit", formatAmount(report.period_profit.total)],
      ["Products", String(report.products.total)],
      ["Low Stock", String(report.products.low_stock)],
      ["Customers", String(report.customers.total)],
      ["Customer Due Total", formatAmount(report.due.total)],
    ],
    theme: "grid",
    headStyles: { fillColor: [37, 99, 235] },
  });

  autoTable(doc, {
    startY: doc.lastAutoTable.finalY + 20,
    head: [["Date", "Total", "Paid", "Due", "Transactions"]],
    body: report.sales_trend.length
      ? report.sales_trend.map((point) => [
          point.label,
          formatAmount(point.total),
          formatAmount(point.paid),
          formatAmount(point.due),
          String(point.transactions || 0),
        ])
      : [["No data", "-", "-", "-", "-"]],
    theme: "grid",
    headStyles: { fillColor: [22, 163, 74] },
    margin: { left: 40, right: 40 },
  });

  autoTable(doc, {
    startY: doc.lastAutoTable.finalY + 20,
    head: [["Date", "Invoice", "Customer", "Total", "Paid", "Due"]],
    body: report.recent_sales.length
      ? report.recent_sales.map((sale) => [
          sale.sale_date?.slice(0, 10) || "-",
          sale.invoice_no || "-",
          sale.customer_name || "Walk-in",
          formatAmount(sale.total_amount),
          formatAmount(sale.paid_amount),
          formatAmount(sale.due_amount),
        ])
      : [["No recent sales", "-", "-", "-", "-", "-"]],
    theme: "grid",
    headStyles: { fillColor: [220, 38, 38] },
    margin: { left: 40, right: 40 },
    styles: { cellWidth: "wrap", overflow: "linebreak" },
    columnStyles: {
      1: { cellWidth: 90 },
      2: { cellWidth: pageWidth - 40 - 40 - 90 - 80 - 80 - 80 - 20 },
      3: { cellWidth: 80 },
      4: { cellWidth: 80 },
      5: { cellWidth: 80 },
    },
  });

  doc.save(filename);
};

const SalesTrendChart = ({ data = [] }) => {
  const chartPoints = useMemo(() => {
    if (!data.length) {
      return { path: "", points: [], width: 520, height: 180, padding: 24 };
    }

    const width = 520;
    const height = 180;
    const padding = 24;
    const maxValue = Math.max(...data.map((point) => Number(point.total || 0)), 1);
    const stepX = data.length === 1 ? 0 : (width - padding * 2) / (data.length - 1);

    const points = data.map((point, index) => {
      const x = padding + stepX * index;
      const y = height - padding - ((height - padding * 2) * Number(point.total || 0)) / maxValue;
      return { ...point, x, y };
    });

    const path = points
      .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`)
      .join(" ");

    return { path, points, width, height, padding };
  }, [data]);

  if (!data.length) {
    return <div className="flex h-32 items-center justify-center text-sm text-slate-400">No sales found for this range.</div>;
  }

  return (
    <div className="space-y-3">
      <svg viewBox={`0 0 ${chartPoints.width} ${chartPoints.height}`} className="h-44 w-full">
        <defs>
          <linearGradient id="salesTrendFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#2563eb" stopOpacity="0.28" />
            <stop offset="100%" stopColor="#2563eb" stopOpacity="0.02" />
          </linearGradient>
        </defs>
        {[0, 1, 2, 3].map((line) => {
          const y = chartPoints.padding + ((chartPoints.height - chartPoints.padding * 2) / 3) * line;
          return (
            <line
              key={line}
              x1={chartPoints.padding}
              x2={chartPoints.width - chartPoints.padding}
              y1={y}
              y2={y}
              stroke="#e2e8f0"
              strokeDasharray="4 6"
            />
          );
        })}
        <path
          d={`${chartPoints.path} L ${chartPoints.points.at(-1).x} ${chartPoints.height - chartPoints.padding} L ${chartPoints.points[0].x} ${chartPoints.height - chartPoints.padding} Z`}
          fill="url(#salesTrendFill)"
        />
        <path d={chartPoints.path} fill="none" stroke="#2563eb" strokeWidth="3" strokeLinecap="round" />
        {chartPoints.points.map((point) => (
          <g key={point.label}>
            <circle cx={point.x} cy={point.y} r="4" fill="#2563eb" />
            <title>{`${point.label}: ${formatAmount(point.total)}`}</title>
          </g>
        ))}
      </svg>
      <div className="grid grid-cols-2 gap-2 text-xs text-slate-600 sm:grid-cols-4">
        {data.slice(-4).map((point) => (
          <div key={point.label} className="rounded border bg-slate-50 px-2 py-2">
            <div className="font-medium">{point.label}</div>
            <div>Sales: {formatAmount(point.total)}</div>
            <div>Tx: {point.transactions}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

function Report() {
  const [period, setPeriod] = useState("daily");
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");
  const [reportData, setReportData] = useState(() => normalizeReport(null));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [downloading, setDownloading] = useState("");
  const [refreshToken, setRefreshToken] = useState(0);
  const [lastLoadedAt, setLastLoadedAt] = useState("");

  useEffect(() => {
    if (period !== "custom") {
      const preset = getDateRangePreset(period);
      setCustomStartDate(preset.startDate);
      setCustomEndDate(preset.endDate);
    }
  }, [period]);

  const rangeQuery = useMemo(
    () => buildDateRangeQuery(period, customStartDate, customEndDate),
    [period, customStartDate, customEndDate]
  );

  const rangeError = useMemo(() => {
    if (period !== "custom") {
      return "";
    }

    if (!customStartDate || !customEndDate) {
      return "Select both start and end dates for a custom report.";
    }

    if (customStartDate > customEndDate) {
      return "Start date cannot be after end date.";
    }

    return "";
  }, [period, customEndDate, customStartDate]);

  const reportParams = useMemo(() => {
    const params = new URLSearchParams();
    if (rangeQuery.start_date) params.set("start_date", rangeQuery.start_date);
    if (rangeQuery.end_date) params.set("end_date", rangeQuery.end_date);
    return params.toString();
  }, [rangeQuery.end_date, rangeQuery.start_date]);

  const filenameSuffix = useMemo(() => {
    const start = reportData.range.start_date || rangeQuery.start_date || "report";
    const end = reportData.range.end_date || rangeQuery.end_date || start;
    return `${start}-to-${end}`;
  }, [rangeQuery.end_date, rangeQuery.start_date, reportData.range.end_date, reportData.range.start_date]);

  useEffect(() => {
    if (rangeError) {
      setError(rangeError);
      return;
    }

    let active = true;

    const loadReport = async () => {
      try {
        setLoading(true);
        setError("");
        const payload = await apiGet(`/api/reports/dashboard${reportParams ? `?${reportParams}` : ""}`);
        if (!active) {
          return;
        }
        setReportData(normalizeReport(payload));
        setLastLoadedAt(new Date().toLocaleString());
      } catch (err) {
        if (active) {
          setError(err.message || "Failed to load report data.");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    loadReport();

    return () => {
      active = false;
    };
  }, [rangeError, reportParams, refreshToken]);

  const invoiceCount = reportData.recent_sales.length;
  const averageSale = invoiceCount > 0 ? reportData.today_sales.total / invoiceCount : 0;

  const stats = useMemo(
    () => [
      { label: "Total Sales", value: formatAmount(reportData.today_sales.total), hint: `Paid ${formatAmount(reportData.today_sales.paid)}` },
      { label: "Outstanding Due", value: formatAmount(reportData.today_sales.due), hint: `Customer due total ${formatAmount(reportData.due.total)}` },
      { label: "Profit", value: formatAmount(reportData.period_profit.total), hint: "Profit for selected range" },
      { label: "Products / Low Stock", value: `${reportData.products.total} / ${reportData.products.low_stock}`, hint: "Catalog total and low stock count" },
      { label: "Customers", value: String(reportData.customers.total), hint: `Recent invoices ${invoiceCount}` },
      { label: "Average Sale", value: formatAmount(averageSale), hint: "Based on recent loaded invoices" },
    ],
    [averageSale, invoiceCount, reportData]
  );

  const handleDownload = async (format) => {
    try {
      setDownloading(format);

      if (format === "csv" || format === "json") {
        await apiDownload(
          `/api/reports/dashboard/export?${reportParams}${reportParams ? "&" : ""}format=${format}`,
          `sales-report-${filenameSuffix}.${format}`
        );
        return;
      }

      if (format === "excel") {
        await downloadExcel(reportData, `sales-report-${filenameSuffix}.xlsx`);
        return;
      }

      if (format === "pdf") {
        await downloadPdf(reportData, `sales-report-${filenameSuffix}.pdf`);
        return;
      }

      downloadBlob(
        buildReportCsv(reportData),
        `sales-report-${filenameSuffix}.csv`,
        "text/csv;charset=utf-8"
      );
    } catch (downloadError) {
      setError(downloadError.message || "Failed to download report.");
    } finally {
      setDownloading("");
    }
  };

  return (
    <SectionPage
      title="Report"
      description="Review range-based sales performance with safer exports and more dependable report loading."
      stats={stats}
      loading={loading}
      error={error}
    >
      <div className="space-y-4">
        <div className="rounded-xl border border-border/60 bg-card p-4 shadow-sm">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <label className="text-sm font-medium text-foreground">
                Period
                <select
                  value={period}
                  onChange={(event) => setPeriod(event.target.value)}
                  className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
                >
                  {periods.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              {period === "custom" ? (
                <>
                  <label className="text-sm font-medium text-foreground">
                    Start Date
                    <input
                      type="date"
                      value={customStartDate}
                      onChange={(event) => setCustomStartDate(event.target.value)}
                      className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
                    />
                  </label>

                  <label className="text-sm font-medium text-foreground">
                    End Date
                    <input
                      type="date"
                      value={customEndDate}
                      onChange={(event) => setCustomEndDate(event.target.value)}
                      className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
                    />
                  </label>
                </>
              ) : (
                <div className="sm:col-span-2 xl:col-span-3">
                  <p className="text-sm font-medium text-foreground">Date Range</p>
                  <div className="mt-1 rounded-md border border-border/60 bg-muted/20 px-3 py-2 text-sm text-muted-foreground">
                    {reportData.range.start_date || rangeQuery.start_date || "-"} to{" "}
                    {reportData.range.end_date || rangeQuery.end_date || "-"}
                  </div>
                </div>
              )}
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setRefreshToken((value) => value + 1)}
                disabled={loading || Boolean(rangeError)}
                className="rounded-md border border-input bg-background px-3 py-2 text-sm font-medium text-foreground hover:bg-muted disabled:opacity-60"
              >
                {loading ? "Refreshing..." : "Refresh"}
              </button>
              <button
                type="button"
                onClick={() => handleDownload("pdf")}
                disabled={loading || !reportData.range.start_date || Boolean(rangeError)}
                className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
              >
                {downloading === "pdf" ? "Generating PDF..." : "Download PDF"}
              </button>
              <button
                type="button"
                onClick={() => handleDownload("excel")}
                disabled={loading || !reportData.range.start_date || Boolean(rangeError)}
                className="rounded-md border border-input bg-background px-3 py-2 text-sm font-medium text-foreground hover:bg-muted disabled:opacity-60"
              >
                {downloading === "excel" ? "Preparing Excel..." : "Download Excel"}
              </button>
              <button
                type="button"
                onClick={() => handleDownload("csv")}
                disabled={loading || !reportData.range.start_date || Boolean(rangeError)}
                className="rounded-md border border-input bg-background px-3 py-2 text-sm font-medium text-foreground hover:bg-muted disabled:opacity-60"
              >
                {downloading === "csv" ? "Preparing CSV..." : "Download CSV"}
              </button>
              <button
                type="button"
                onClick={() => handleDownload("json")}
                disabled={loading || !reportData.range.start_date || Boolean(rangeError)}
                className="rounded-md border border-input bg-background px-3 py-2 text-sm font-medium text-foreground hover:bg-muted disabled:opacity-60"
              >
                {downloading === "json" ? "Preparing JSON..." : "Download JSON"}
              </button>
            </div>
          </div>

          <div className="mt-3 flex flex-col gap-2 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
            <span>
              Loaded range: {reportData.range.start_date || "-"} to {reportData.range.end_date || "-"}
            </span>
            <span>Last updated: {lastLoadedAt || "Not loaded yet"}</span>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-xl border border-border/60 bg-card p-4 shadow-sm">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-foreground">Sales Trend</h3>
              <span className="text-xs text-muted-foreground">Day-by-day totals in the selected range</span>
            </div>
            <SalesTrendChart data={reportData.sales_trend} />
          </div>

          <div className="rounded-xl border border-border/60 bg-card p-4 shadow-sm">
            <h3 className="text-sm font-semibold text-foreground">Report Snapshot</h3>
            <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
              <div className="rounded-lg border border-border/60 bg-muted/20 p-3">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Sales Collected</p>
                <p className="mt-1 text-lg font-semibold text-foreground">{formatAmount(reportData.today_sales.paid)}</p>
              </div>
              <div className="rounded-lg border border-border/60 bg-muted/20 p-3">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Sales Due</p>
                <p className="mt-1 text-lg font-semibold text-foreground">{formatAmount(reportData.today_sales.due)}</p>
              </div>
              <div className="rounded-lg border border-border/60 bg-muted/20 p-3">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Customer Due Total</p>
                <p className="mt-1 text-lg font-semibold text-foreground">{formatAmount(reportData.due.total)}</p>
              </div>
              <div className="rounded-lg border border-border/60 bg-muted/20 p-3">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Low Stock Products</p>
                <p className="mt-1 text-lg font-semibold text-foreground">{reportData.products.low_stock}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-border/60 bg-card p-4 shadow-sm">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground">Recent Sales</h3>
            <span className="text-xs text-muted-foreground">Latest {reportData.recent_sales.length} invoices in this report</span>
          </div>

          {reportData.recent_sales.length ? (
            <div className="overflow-x-auto rounded-lg border border-border/60">
              <table className="min-w-full text-sm">
                <thead className="bg-muted/30 text-left">
                  <tr>
                    <th className="px-3 py-2">Date</th>
                    <th className="px-3 py-2">Invoice</th>
                    <th className="px-3 py-2">Customer</th>
                    <th className="px-3 py-2 text-right">Total</th>
                    <th className="px-3 py-2 text-right">Paid</th>
                    <th className="px-3 py-2 text-right">Due</th>
                  </tr>
                </thead>
                <tbody>
                  {reportData.recent_sales.map((sale, index) => (
                    <tr key={`${sale.id || sale.invoice_no || "sale"}-${index}`} className="border-t border-border/50">
                      <td className="px-3 py-2">{sale.sale_date?.slice(0, 10) || "-"}</td>
                      <td className="px-3 py-2">{sale.invoice_no || "-"}</td>
                      <td className="px-3 py-2">{sale.customer_name || "Walk-in"}</td>
                      <td className="px-3 py-2 text-right">{formatAmount(sale.total_amount)}</td>
                      <td className="px-3 py-2 text-right">{formatAmount(sale.paid_amount)}</td>
                      <td className="px-3 py-2 text-right">{formatAmount(sale.due_amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-border/60 px-4 py-8 text-center text-sm text-muted-foreground">
              No sales found for this range.
            </div>
          )}
        </div>
      </div>
    </SectionPage>
  );
}

export default Report;
