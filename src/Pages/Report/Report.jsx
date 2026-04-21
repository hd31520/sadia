import React, { useState, useEffect, useMemo } from "react";
import * as XLSX from "xlsx";
import { apiGet } from "../../lib/api";

const periods = [
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
  { value: "yearly", label: "Yearly" },
  { value: "all", label: "All Time" },
];

const formatCurrency = (value) =>
  new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value || 0));

const escapeCsvValue = (value) => `"${String(value ?? "").replace(/"/g, '""')}"`;

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

const buildReportCsv = (report) => {
  const summaryRows = [
    ["Metric", "Value"],
    ["Range Start", report?.range?.start_date || ""],
    ["Range End", report?.range?.end_date || ""],
    ["Total Sales", report?.today_sales?.total || 0],
    ["Paid", report?.today_sales?.paid || 0],
    ["Due", report?.today_sales?.due || 0],
    ["Profit", report?.period_profit?.total || 0],
  ];

  const trendRows = [
    [],
    ["Sales Trend"],
    ["Date", "Total", "Paid", "Due", "Transactions"],
    ...((report?.sales_trend || []).map((point) => [
      point.label,
      point.total,
      point.paid,
      point.due,
      point.transactions,
    ])),
  ];

  const recentRows = [
    [],
    ["Recent Sales"],
    ["Date", "Invoice", "Customer", "Total", "Paid", "Due"],
    ...((report?.recent_sales || []).map((sale) => [
      sale.sale_date?.slice(0, 10) || "",
      sale.invoice_no,
      sale.customer_name || "N/A",
      sale.total_amount,
      sale.paid_amount,
      sale.due_amount,
    ])),
  ];

  return [...summaryRows, ...trendRows, ...recentRows]
    .map((row) => row.map(escapeCsvValue).join(","))
    .join("\n");
};

const buildExcelData = (report) => {
  // Prepare data for Excel sheets
  const summary = [
    ["Metric", "Value"],
    ["Range Start", report?.range?.start_date || ""],
    ["Range End", report?.range?.end_date || ""],
    ["Total Sales", report?.today_sales?.total || 0],
    ["Paid", report?.today_sales?.paid || 0],
    ["Due", report?.today_sales?.due || 0],
    ["Profit", report?.period_profit?.total || 0],
  ];

  const trend = [
    ["Date", "Total", "Paid", "Due", "Transactions"],
    ...((report?.sales_trend || []).map((point) => [
      point.label,
      point.total,
      point.paid,
      point.due,
      point.transactions,
    ])),
  ];

  const recent = [
    ["Date", "Invoice", "Customer", "Total", "Paid", "Due"],
    ...((report?.recent_sales || []).map((sale) => [
      sale.sale_date?.slice(0, 10) || "",
      sale.invoice_no,
      sale.customer_name || "N/A",
      sale.total_amount,
      sale.paid_amount,
      sale.due_amount,
    ])),
  ];

  return { summary, trend, recent };
};

const downloadExcel = (report, filename) => {
  const { summary, trend, recent } = buildExcelData(report);
  const wb = XLSX.utils.book_new();
  const wsSummary = XLSX.utils.aoa_to_sheet(summary);
  const wsTrend = XLSX.utils.aoa_to_sheet(trend);
  const wsRecent = XLSX.utils.aoa_to_sheet(recent);
  XLSX.utils.book_append_sheet(wb, wsSummary, "Summary");
  XLSX.utils.book_append_sheet(wb, wsTrend, "Sales Trend");
  XLSX.utils.book_append_sheet(wb, wsRecent, "Recent Sales");
  XLSX.writeFile(wb, filename);
};

const buildDateRange = (period) => {
  const now = new Date();
  let start_date;
  let end_date;

  if (period === "daily") {
    start_date = end_date = now.toISOString().slice(0, 10);
  } else if (period === "weekly") {
    const current = new Date(now);
    const day = current.getDay();
    const diffToSunday = current.getDate() - day;
    const weekStart = new Date(current.getFullYear(), current.getMonth(), diffToSunday);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    start_date = weekStart.toISOString().slice(0, 10);
    end_date = weekEnd.toISOString().slice(0, 10);
  } else if (period === "monthly") {
    start_date = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
    end_date = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10);
  } else if (period === "yearly") {
    start_date = new Date(now.getFullYear(), 0, 1).toISOString().slice(0, 10);
    end_date = new Date(now.getFullYear(), 11, 31).toISOString().slice(0, 10);
  }

  return { start_date, end_date };
};

const SalesTrendChart = ({ data = [] }) => {
  const chartPoints = useMemo(() => {
    if (!data.length) {
      return { path: "", points: [] };
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

    return { path, points, width, height, padding, maxValue };
  }, [data]);

  if (!data.length) {
    return <div className="h-32 flex items-center justify-center text-sm text-slate-400">No sales found for this range.</div>;
  }

  return (
    <div className="space-y-3">
      <svg viewBox={`0 0 ${chartPoints.width} ${chartPoints.height}`} className="w-full h-44">
        <defs>
          <linearGradient id="salesTrendFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#2563eb" stopOpacity="0.28" />
            <stop offset="100%" stopColor="#2563eb" stopOpacity="0.02" />
          </linearGradient>
        </defs>
        {[0, 1, 2, 3].map((line) => {
          const y =
            chartPoints.padding +
            ((chartPoints.height - chartPoints.padding * 2) / 3) * line;
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
            <title>{`${point.label}: ${formatCurrency(point.total)}`}</title>
          </g>
        ))}
      </svg>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs text-slate-600">
        {data.slice(-4).map((point) => (
          <div key={point.label} className="rounded border bg-slate-50 px-2 py-2">
            <div className="font-medium">{point.label}</div>
            <div>Sales: {formatCurrency(point.total)}</div>
            <div>Tx: {point.transactions}</div>
          </div>
        ))}
      </div>
    </div>
  );
};


const Report = () => {
  const [period, setPeriod] = useState("daily");
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [downloading, setDownloading] = useState(null);

  const { start_date, end_date } = useMemo(() => buildDateRange(period), [period]);
  const reportParams = useMemo(
    () => (start_date && end_date ? `?start_date=${start_date}&end_date=${end_date}` : ""),
    [start_date, end_date]
  );

  useEffect(() => {
    setLoading(true);
    setError(null);

    apiGet(`/api/reports/dashboard${reportParams}`)
      .then((report) => {
        setReportData(report);
      })
      .catch((err) => setError(err.message || "Failed to load report data"))
      .finally(() => setLoading(false));
  }, [reportParams]);

  const handleDownload = async (format) => {
    try {
      setDownloading(format);
      const filenameSuffix =
        reportData?.range?.start_date && reportData?.range?.end_date
          ? `${reportData.range.start_date}-to-${reportData.range.end_date}`
          : period;

      if (format === "json") {
        downloadBlob(
          JSON.stringify(reportData, null, 2),
          `sales-report-${filenameSuffix}.json`,
          "application/json;charset=utf-8"
        );
      } else if (format === "excel") {
        downloadExcel(
          reportData,
          `sales-report-${filenameSuffix}.xlsx`
        );
      } else {
        downloadBlob(
          buildReportCsv(reportData),
          `sales-report-${filenameSuffix}.csv`,
          "text/csv;charset=utf-8"
        );
      }
    } catch (downloadError) {
      setError(downloadError.message || "Failed to download report.");
    } finally {
      setDownloading(null);
    }
  };

    return (
      <div className="p-2 sm:p-4 max-w-5xl mx-auto w-full">
        <h2 className="text-2xl font-bold mb-4 text-center">Sales Report</h2>
        <div className="mb-4 flex flex-col gap-3 rounded-xl border bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-4">
            <label htmlFor="period" className="font-medium">Select Period:</label>
            <select
              id="period"
              value={period}
              onChange={e => setPeriod(e.target.value)}
              className="border rounded px-2 py-1 w-full sm:w-auto"
            >
              {periods.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            <div className="text-sm text-slate-500">
              {reportData?.range?.start_date} to {reportData?.range?.end_date}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => handleDownload("csv")}
              disabled={downloading !== null}
              className="rounded bg-blue-600 px-3 py-2 text-sm font-medium text-white disabled:opacity-60"
            >
              {downloading === "csv" ? "Downloading CSV..." : "Download CSV"}
            </button>
            <button
              type="button"
              onClick={() => handleDownload("excel")}
              disabled={downloading !== null}
              className="rounded bg-green-600 px-3 py-2 text-sm font-medium text-white disabled:opacity-60"
            >
              {downloading === "excel" ? "Downloading Excel..." : "Download Excel"}
            </button>
            <button
              type="button"
              onClick={() => handleDownload("json")}
              disabled={downloading !== null}
              className="rounded border border-slate-300 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700 disabled:opacity-60"
            >
              {downloading === "json" ? "Downloading JSON..." : "Download JSON"}
            </button>
          </div>
        </div>
        {loading ? (
          <div className="text-center py-8">Loading...</div>
        ) : error ? (
          <div className="text-red-500 text-center py-8">{error}</div>
        ) : (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
              <div className="bg-blue-50 border rounded p-4 flex flex-col items-center">
                <span className="text-xs text-gray-500">Total Sales</span>
                <span className="text-lg font-bold">{formatCurrency(reportData?.today_sales?.total ?? 0)}</span>
              </div>
              <div className="bg-green-50 border rounded p-4 flex flex-col items-center">
                <span className="text-xs text-gray-500">Paid</span>
                <span className="text-lg font-bold">{formatCurrency(reportData?.today_sales?.paid ?? 0)}</span>
              </div>
              <div className="bg-red-50 border rounded p-4 flex flex-col items-center">
                <span className="text-xs text-gray-500">Due</span>
                <span className="text-lg font-bold">{formatCurrency(reportData?.today_sales?.due ?? 0)}</span>
              </div>
            </div>

            <div className="border rounded bg-white shadow p-4 mb-4">
              <div className="mb-2 flex items-center justify-between">
                <div className="text-sm font-semibold text-slate-700">Sales Trend</div>
                <div className="text-xs text-slate-500">Daily totals for the selected range</div>
              </div>
              <SalesTrendChart data={reportData?.sales_trend || []} />
            </div>

            {/* Recent Sales Table */}
            {reportData?.recent_sales && reportData.recent_sales.length > 0 && (
              <div className="border rounded bg-white shadow p-4 mb-4 overflow-x-auto">
                <div className="font-semibold mb-2">Recent Sales</div>
                <table className="min-w-full text-xs">
                  <thead>
                    <tr>
                      <th className="px-2 py-1 text-left">Date</th>
                      <th className="px-2 py-1 text-left">Invoice</th>
                      <th className="px-2 py-1 text-left">Customer</th>
                      <th className="px-2 py-1 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reportData.recent_sales.map((sale, idx) => (
                      <tr key={idx} className="odd:bg-gray-50">
                        <td className="px-2 py-1">{sale.sale_date?.slice(0, 10) ?? ''}</td>
                        <td className="px-2 py-1">{sale.invoice_no}</td>
                        <td className="px-2 py-1">{sale.customer_name || 'N/A'}</td>
                        <td className="px-2 py-1 text-right">{formatCurrency(sale.total_amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>
    );
};

export default Report;
