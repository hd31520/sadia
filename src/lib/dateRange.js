export function formatLocalDateInput(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function getDateRangePreset(period) {
  const today = new Date();
  const endDate = formatLocalDateInput(today);
  const startDate = new Date(today);

  if (period === "daily") {
    return { startDate: endDate, endDate };
  }

  if (period === "weekly") {
    const day = today.getDay();
    const diff = day === 0 ? 6 : day - 1;
    startDate.setDate(today.getDate() - diff);
    return { startDate: formatLocalDateInput(startDate), endDate };
  }

  if (period === "monthly") {
    startDate.setDate(1);
    return { startDate: formatLocalDateInput(startDate), endDate };
  }

  if (period === "yearly") {
    startDate.setMonth(0, 1);
    return { startDate: formatLocalDateInput(startDate), endDate };
  }

  return { startDate: "", endDate: "" };
}

export function buildDateRangeQuery(period, customStartDate, customEndDate) {
  if (period === "custom") {
    return {
      start_date: customStartDate || "",
      end_date: customEndDate || "",
    };
  }

  if (period === "all") {
    return {
      start_date: "1970-01-01",
      end_date: formatLocalDateInput(new Date()),
    };
  }

  return getDateRangePreset(period);
}
