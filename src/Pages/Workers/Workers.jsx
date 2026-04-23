import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import SectionPage from "../Shared/SectionPage";
import { apiDelete, apiGet, apiPost, apiPut, formatCurrency, getStoredUser } from "../../lib/api";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../../components/ui/dialog";
import { CalendarDays, FileSpreadsheet, MoreVertical } from "lucide-react";

const getTodayToggleState = (status) => {
  if (status === "absent") {
    return {
      label: "Absent",
      nextStatus: "present",
      className: "border-red-500/20 bg-red-500/10 text-red-600",
    };
  }

  return {
    label: "Present",
    nextStatus: "absent",
    className: "border-emerald-500/20 bg-emerald-500/10 text-emerald-600",
  };
};

function Workers() {
  const navigate = useNavigate();
  const today = new Date().toISOString().slice(0, 10);
  const todayWeekday = new Date().toLocaleDateString("en-US", { weekday: "long" }).toLowerCase();
  const [workers, setWorkers] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [open, setOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [activeWorker, setActiveWorker] = useState(null);
  const [submitError, setSubmitError] = useState("");
  const [attendanceError, setAttendanceError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [attendanceSubmitting, setAttendanceSubmitting] = useState(false);
  const [editError, setEditError] = useState("");
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryError, setSummaryError] = useState("");
  const [summaryMonth, setSummaryMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [summaryYear, setSummaryYear] = useState(() => String(new Date().getFullYear()));
  const [monthlySummaryRows, setMonthlySummaryRows] = useState([]);
  const [yearlySummaryRows, setYearlySummaryRows] = useState([]);
  const [form, setForm] = useState({
    username: "",
    password: "",
    name: "",
    role: "worker",
    monthly_salary: "",
  });
  const [editForm, setEditForm] = useState({
    name: "",
    role: "worker",
    monthly_salary: "",
  });
  const [menuOpenId, setMenuOpenId] = useState(null);
  const [weekendDay, setWeekendDay] = useState(() => {
    const storedWeekendDay = localStorage.getItem("pos_weekend_day");
    if (storedWeekendDay) {
      return storedWeekendDay;
    }

    return new Date().toLocaleDateString("en-US", { weekday: "long" }).toLowerCase();
  });

  const userRole = useMemo(() => getStoredUser()?.role || "worker", []);
  const currentUserId = useMemo(() => Number(getStoredUser()?.id || 0), []);

  const refreshWorkers = async () => {
    try {
      const payload = await apiGet("/api/users/all");
      setWorkers(payload || []);
    } catch {
      const fallbackPayload = await apiGet("/api/users/workers");
      setWorkers(fallbackPayload || []);
    }
  };

  const refreshAttendanceSummaries = useCallback(async () => {
    try {
      setSummaryLoading(true);
      const [monthlyPayload, yearlyPayload] = await Promise.all([
        apiGet(`/api/attendance/monthly-summary?month=${summaryMonth}`),
        apiGet(`/api/attendance/yearly-summary?year=${summaryYear}`),
      ]);
      setMonthlySummaryRows(monthlyPayload?.rows || []);
      setYearlySummaryRows(yearlyPayload?.rows || []);
      setSummaryError("");
    } catch (err) {
      setSummaryError(err.message || "Failed to load attendance history");
    } finally {
      setSummaryLoading(false);
    }
  }, [summaryMonth, summaryYear]);

  useEffect(() => {
    let active = true;

    const loadWorkers = async () => {
      try {
        setLoading(true);
        await refreshWorkers();
        if (active) {
          setError("");
        }
      } catch (err) {
        if (active) {
          setError(err.message || "Failed to load workers");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    loadWorkers();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    refreshAttendanceSummaries();
  }, [refreshAttendanceSummaries]);

  const stats = useMemo(() => {
    const presentToday = workers.reduce((sum, worker) => sum + Number(worker.present_day_count || 0), 0);
    const presentMonth = workers.reduce((sum, worker) => sum + Number(worker.present_count || 0), 0);
    const halfDayMonth = workers.reduce((sum, worker) => sum + Number(worker.half_day_count || 0), 0);
    const weekendMonth = workers.reduce((sum, worker) => sum + Number(worker.weekend_count || 0), 0);
    const halfWeekendMonth = workers.reduce((sum, worker) => sum + Number(worker.half_weekend_count || 0), 0);
    const absentMonth = workers.reduce((sum, worker) => sum + Number(worker.absent_count || 0), 0);

    return [
      { label: "Total Workers", value: String(workers.length), hint: "Registered worker accounts" },
      { label: "Auto Present Today", value: String(presentToday), hint: "Workers auto-marked present today" },
      {
        label: "Month Salary",
        value: formatCurrency(workers.reduce((sum, worker) => sum + Number(worker.month_salary || 0), 0)),
        hint: "Current month payroll by attendance",
      },
      { label: "Present", value: String(presentMonth), hint: "Current month present + late" },
      { label: "Half Day", value: String(halfDayMonth), hint: "Current month half day count" },
      { label: "Weekend", value: String(weekendMonth), hint: "Current month weekend count" },
      { label: "Half Weekend", value: String(halfWeekendMonth), hint: "Current month half-weekend count" },
      { label: "Absent", value: String(absentMonth), hint: "Current month absence count" },
    ];
  }, [workers]);

  const filteredWorkers = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) {
      return workers;
    }

    return workers.filter((worker) => {
      const searchableValues = [
        worker.name,
        worker.username,
        worker.role,
        worker.today_status,
        String(worker.present_day_count ?? ""),
        String(worker.present_count ?? ""),
        String(worker.half_day_count ?? ""),
        String(worker.absent_count ?? ""),
        String(worker.daily_salary ?? ""),
        String(worker.month_salary ?? ""),
      ];

      return searchableValues.some((value) => String(value || "").toLowerCase().includes(query));
    });
  }, [workers, searchTerm]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleEditChange = (event) => {
    const { name, value } = event.target;
    setEditForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitError("");

    if (!form.username.trim() || !form.password.trim() || !form.name.trim()) {
      setSubmitError("Name, username and password are required.");
      return;
    }

    const monthlySalary = Number(form.monthly_salary || 0);
    if (Number.isNaN(monthlySalary) || monthlySalary < 0) {
      setSubmitError("Monthly salary must be a non-negative number.");
      return;
    }

    const salary = monthlySalary > 0 ? monthlySalary / 30 : 0;

    try {
      setSubmitting(true);
      await apiPost("/api/users", {
        username: form.username.trim(),
        password: form.password,
        name: form.name.trim(),
        role: form.role,
        daily_salary: salary,
      });
      await refreshWorkers();
      await refreshAttendanceSummaries();
      setForm({ username: "", password: "", name: "", role: "worker", monthly_salary: "" });
      setOpen(false);
    } catch (err) {
      setSubmitError(err.message || "Failed to add worker");
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditWorker = (worker) => {
    setActiveWorker(worker);
    setEditForm({
      name: worker.name || "",
      role: worker.role || "worker",
      monthly_salary: String(Number(worker.daily_salary || 0) * 30),
    });
    setEditError("");
    setEditOpen(true);
  };

  const handleUpdateWorker = async (event) => {
    event.preventDefault();
    if (!activeWorker) {
      return;
    }

    setEditError("");
    const monthlySalary = Number(editForm.monthly_salary || 0);
    if (Number.isNaN(monthlySalary) || monthlySalary < 0) {
      setEditError("Monthly salary must be a non-negative number.");
      return;
    }

    const nextSalary = monthlySalary > 0 ? monthlySalary / 30 : 0;

    try {
      setEditing(true);
      await apiPut(`/api/users/${activeWorker.id}`, {
        name: editForm.name.trim() || activeWorker.name,
        role: editForm.role,
        daily_salary: nextSalary,
      });
      await refreshWorkers();
      await refreshAttendanceSummaries();
      setEditOpen(false);
      setActiveWorker(null);
    } catch (err) {
      setEditError(err.message || "Failed to update worker");
    } finally {
      setEditing(false);
    }
  };

  const handleDeleteWorker = (worker) => {
    setActiveWorker(worker);
    setDeleteOpen(true);
  };

  const submitQuickAttendance = async (worker, status) => {
    setAttendanceError("");

    try {
      setAttendanceSubmitting(true);
      await apiPost("/api/attendance", {
        user_id: Number(worker.id),
        date: today,
        status,
      });
      await refreshWorkers();
      await refreshAttendanceSummaries();
    } catch (err) {
      setAttendanceError(err.message || "Failed to save attendance");
    } finally {
      setAttendanceSubmitting(false);
    }
  };

  const confirmDeleteWorker = async () => {
    if (!activeWorker) {
      return;
    }

    if (Number(activeWorker.id) === Number(currentUserId)) {
      setError("You cannot delete your currently logged in account.");
      setDeleteOpen(false);
      setActiveWorker(null);
      return;
    }

    try {
      setDeleting(true);
      await apiDelete(`/api/users/${activeWorker.id}`);
      await refreshWorkers();
      await refreshAttendanceSummaries();
      setDeleteOpen(false);
      setActiveWorker(null);
    } catch (err) {
      setError(err.message || "Failed to delete worker");
    } finally {
      setDeleting(false);
    }
  };

  const handleExportMonthlyAttendance = async () => {
    try {
      const XLSX = await import("xlsx");
      const exportRows = monthlySummaryRows.map((worker) => ({
        Worker: worker.name,
        Username: worker.username,
        Month: worker.salary_month,
        Present: Number(worker.present_count || 0),
        "Half Day": Number(worker.half_day_count || 0),
        Weekend: Number(worker.weekend_count || 0),
        "Half Weekend": Number(worker.half_weekend_count || 0),
        Absent: Number(worker.absent_count || 0),
        "Attendance Days": Number(worker.attendance_days || 0),
        "Work Units": Number(worker.work_units || 0),
        "Month Salary": Number(worker.month_salary || 0),
      }));

      const workbook = XLSX.utils.book_new();
      const worksheet = XLSX.utils.json_to_sheet(exportRows);
      XLSX.utils.book_append_sheet(workbook, worksheet, "Attendance");
      XLSX.writeFile(workbook, `attendance-history-${summaryMonth}.xlsx`);
    } catch (err) {
      setSummaryError(err.message || "Failed to export attendance history");
    }
  };

  return (
    <SectionPage
      title="Worker"
      description="Workers are auto-marked present today, with calendar history, Excel month export, and yearly attendance totals."
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
            placeholder="Search worker, username, role, salary..."
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground xl:max-w-sm"
          />

          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
            <input
              type="month"
              value={summaryMonth}
              onChange={(event) => setSummaryMonth(event.target.value)}
              className="rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
            />
            <input
              type="number"
              min="2000"
              max="3000"
              value={summaryYear}
              onChange={(event) => setSummaryYear(event.target.value)}
              className="rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground sm:w-32"
            />
            <button
              type="button"
              onClick={handleExportMonthlyAttendance}
              className="inline-flex items-center gap-2 rounded-md border border-input px-4 py-2 text-sm font-medium text-foreground hover:bg-muted"
            >
              <FileSpreadsheet className="h-4 w-4" />
              Excel History
            </button>
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <button className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
                  Add Worker
                </button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-115">
                <DialogHeader>
                  <DialogTitle>Add Worker</DialogTitle>
                  <DialogDescription>Create worker account with role and monthly salary only.</DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-3">
                  <label className="block text-xs text-muted-foreground">
                    Worker Name
                    <input
                      name="name"
                      value={form.name}
                      onChange={handleChange}
                      className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
                      placeholder="Worker name"
                      required
                    />
                  </label>

                  <label className="block text-xs text-muted-foreground">
                    Role
                    <select
                      name="role"
                      value={form.role}
                      onChange={handleChange}
                      className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
                    >
                      <option value="worker">Worker</option>
                      <option value="admin">Admin</option>
                    </select>
                  </label>

                  <label className="block text-xs text-muted-foreground">
                    Username
                    <input
                      name="username"
                      value={form.username}
                      onChange={handleChange}
                      className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
                      placeholder="worker_username"
                      required
                    />
                  </label>

                  <label className="block text-xs text-muted-foreground">
                    Password
                    <input
                      name="password"
                      type="password"
                      value={form.password}
                      onChange={handleChange}
                      className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
                      placeholder="Password"
                      required
                    />
                  </label>

                  <label className="block text-xs text-muted-foreground">
                    Monthly Salary
                    <input
                      name="monthly_salary"
                      type="number"
                      min="0"
                      step="0.01"
                      value={form.monthly_salary}
                      onChange={handleChange}
                      className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
                      placeholder="0.00"
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
                      {submitting ? "Adding..." : "Add Worker"}
                    </button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <Dialog open={editOpen} onOpenChange={setEditOpen}>
          <DialogContent className="sm:max-w-105">
            <DialogHeader>
              <DialogTitle>Edit Worker</DialogTitle>
              <DialogDescription>Update worker name, role, and monthly salary.</DialogDescription>
            </DialogHeader>

            <form onSubmit={handleUpdateWorker} className="space-y-3">
              <label className="block text-xs text-muted-foreground">
                Worker Name
                <input
                  name="name"
                  value={editForm.name}
                  onChange={handleEditChange}
                  className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
                  required
                />
              </label>

              <label className="block text-xs text-muted-foreground">
                Role
                <select
                  name="role"
                  value={editForm.role}
                  onChange={handleEditChange}
                  className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
                >
                  <option value="worker">Worker</option>
                  <option value="admin">Admin</option>
                </select>
              </label>

              <label className="block text-xs text-muted-foreground">
                Monthly Salary
                <input
                  name="monthly_salary"
                  type="number"
                  min="0"
                  step="0.01"
                  value={editForm.monthly_salary}
                  onChange={handleEditChange}
                  className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
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

        <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
          <DialogContent className="sm:max-w-105">
            <DialogHeader>
              <DialogTitle>Delete Worker</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete {activeWorker?.name || "this worker"}?
              </DialogDescription>
            </DialogHeader>
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
                onClick={confirmDeleteWorker}
                disabled={deleting}
                className="rounded-md bg-destructive px-4 py-2 text-sm font-medium text-destructive-foreground disabled:opacity-60"
              >
                {deleting ? "Deleting..." : "Delete"}
              </button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {attendanceError ? <p className="text-sm text-destructive">{attendanceError}</p> : null}
        {summaryError ? <p className="text-sm text-destructive">{summaryError}</p> : null}

        {userRole === "admin" ? (
          <div className="rounded-md border border-border/60 bg-muted/20 p-3">
            <label className="block text-xs text-muted-foreground">
              Weekend Day (Admin Only)
              <select
                value={weekendDay}
                onChange={(event) => {
                  setWeekendDay(event.target.value);
                  localStorage.setItem("pos_weekend_day", event.target.value);
                }}
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground sm:w-64"
              >
                <option value="">Select day</option>
                <option value="saturday">Saturday</option>
                <option value="sunday">Sunday</option>
                <option value="monday">Monday</option>
                <option value="tuesday">Tuesday</option>
                <option value="wednesday">Wednesday</option>
                <option value="thursday">Thursday</option>
                <option value="friday">Friday</option>
              </select>
            </label>
            <p className="mt-2 text-xs text-muted-foreground">
              Workers are auto-created as present today. You can still switch any worker to absent, half day, or weekend manually.
            </p>
          </div>
        ) : null}

        <div className="rounded-lg border border-border/60">
          <div className="hidden md:block">
            <table className="w-full table-fixed text-sm">
              <thead className="bg-muted/30 text-left">
                <tr>
                  <th className="w-[14%] px-3 py-2">Name</th>
                  <th className="w-[12%] px-3 py-2">Username</th>
                  <th className="w-[10%] px-3 py-2">Role</th>
                  <th className="w-[9%] px-3 py-2">Today</th>
                  <th className="w-[8%] px-3 py-2">Present</th>
                  <th className="w-[8%] px-3 py-2">Half Day</th>
                  <th className="w-[8%] px-3 py-2">Absent</th>
                  <th className="w-[10%] px-3 py-2">Daily Salary</th>
                  <th className="w-[10%] px-3 py-2">Month Salary</th>
                  <th className="w-[21%] px-3 py-2">Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredWorkers.map((worker) => (
                  <tr key={worker.id} className="border-t border-border/50 align-top">
                    <td className="px-3 py-2"><span className="block truncate">{worker.name}</span></td>
                    <td className="px-3 py-2"><span className="block truncate">{worker.username}</span></td>
                    <td className="px-3 py-2 whitespace-nowrap">{worker.role}</td>
                    <td className="px-3 py-2">
                      {worker.role === "worker" ? (
                        <button
                          type="button"
                          onClick={() => submitQuickAttendance(worker, getTodayToggleState(worker.today_status).nextStatus)}
                          disabled={attendanceSubmitting}
                          className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium disabled:opacity-60 ${getTodayToggleState(worker.today_status).className}`}
                        >
                          {getTodayToggleState(worker.today_status).label}
                        </button>
                      ) : (
                        <span className="text-xs text-muted-foreground">N/A</span>
                      )}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">{worker.present_count}</td>
                    <td className="px-3 py-2 whitespace-nowrap">{worker.half_day_count || 0}</td>
                    <td className="px-3 py-2 whitespace-nowrap">{worker.absent_count}</td>
                    <td className="px-3 py-2 whitespace-nowrap">{formatCurrency(worker.daily_salary)}</td>
                    <td className="px-3 py-2 font-medium whitespace-nowrap">{formatCurrency(worker.month_salary)}</td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2">
                        {worker.role === "worker" ? (
                          <button
                            type="button"
                            onClick={() => navigate(`/worker/${worker.id}/history`)}
                            className="inline-flex items-center gap-1 rounded-md border border-input px-2.5 py-1.5 text-xs font-medium hover:bg-muted"
                          >
                            <CalendarDays className="h-4 w-4" />
                            History
                          </button>
                        ) : null}
                        <div className="relative inline-block text-left overflow-visible">
                          <button
                            type="button"
                            onClick={() => setMenuOpenId((current) => (current === worker.id ? null : worker.id))}
                            className="inline-flex items-center gap-1 rounded-md border border-input px-2.5 py-1.5 text-xs font-medium hover:bg-muted"
                          >
                            <MoreVertical className="h-4 w-4" />
                          </button>
                          {menuOpenId === worker.id ? (
                            <div className="absolute bottom-full right-0 z-50 mb-2 w-48 rounded-lg border border-border bg-background p-1 shadow-xl">
                              <button
                                type="button"
                                onClick={() => {
                                  submitQuickAttendance(worker, "half_day");
                                  setMenuOpenId(null);
                                }}
                                className="block w-full rounded-md px-3 py-2 text-left text-xs font-medium hover:bg-muted"
                              >
                                Mark Half Day
                              </button>
                              {userRole === "admin" && worker.role === "worker" ? (
                                <>
                                  <button
                                    type="button"
                                    disabled={weekendDay !== todayWeekday}
                                    onClick={() => {
                                      submitQuickAttendance(worker, "weekend");
                                      setMenuOpenId(null);
                                    }}
                                    className="block w-full rounded-md px-3 py-2 text-left text-xs font-medium hover:bg-muted disabled:opacity-50"
                                  >
                                    Mark Weekend
                                  </button>
                                  <button
                                    type="button"
                                    disabled={weekendDay !== todayWeekday}
                                    onClick={() => {
                                      submitQuickAttendance(worker, "half_weekend");
                                      setMenuOpenId(null);
                                    }}
                                    className="block w-full rounded-md px-3 py-2 text-left text-xs font-medium hover:bg-muted disabled:opacity-50"
                                  >
                                    Mark Half Weekend
                                  </button>
                                </>
                              ) : null}
                              <button
                                type="button"
                                onClick={() => {
                                  handleEditWorker(worker);
                                  setMenuOpenId(null);
                                }}
                                className="block w-full rounded-md px-3 py-2 text-left text-xs font-medium hover:bg-muted"
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                disabled={Number(worker.id) === Number(currentUserId)}
                                onClick={() => {
                                  handleDeleteWorker(worker);
                                  setMenuOpenId(null);
                                }}
                                className="block w-full rounded-md px-3 py-2 text-left text-xs font-medium text-destructive hover:bg-destructive/10 disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                Delete
                              </button>
                            </div>
                          ) : null}
                        </div>
                      </div>
                    </td>
                  </tr>
                ))}
                {!loading && filteredWorkers.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="px-3 py-6 text-center text-sm text-muted-foreground">
                      No workers found.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>

          <div className="space-y-3 p-3 md:hidden">
            {filteredWorkers.map((worker) => (
              <div key={worker.id} className="rounded-lg border border-border/60 bg-card p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-foreground">{worker.name}</p>
                    <p className="text-xs text-muted-foreground">{worker.username}</p>
                    <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">{worker.role}</p>
                  </div>
                  {worker.role === "worker" ? (
                    <button
                      type="button"
                      onClick={() => submitQuickAttendance(worker, getTodayToggleState(worker.today_status).nextStatus)}
                      disabled={attendanceSubmitting}
                      className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium disabled:opacity-60 ${getTodayToggleState(worker.today_status).className}`}
                    >
                      {getTodayToggleState(worker.today_status).label}
                    </button>
                  ) : (
                    <span className="text-xs text-muted-foreground">Admin</span>
                  )}
                </div>

                <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                  <div className="rounded-md bg-muted/40 p-2"><span className="block text-[11px] uppercase">Present</span><span className="text-sm text-foreground">{worker.present_count}</span></div>
                  <div className="rounded-md bg-muted/40 p-2"><span className="block text-[11px] uppercase">Half Day</span><span className="text-sm text-foreground">{worker.half_day_count || 0}</span></div>
                  <div className="rounded-md bg-muted/40 p-2"><span className="block text-[11px] uppercase">Absent</span><span className="text-sm text-foreground">{worker.absent_count}</span></div>
                  <div className="rounded-md bg-muted/40 p-2"><span className="block text-[11px] uppercase">Daily Salary</span><span className="text-sm text-foreground">{formatCurrency(worker.daily_salary)}</span></div>
                  <div className="rounded-md bg-muted/40 p-2 col-span-2"><span className="block text-[11px] uppercase">Month Salary</span><span className="text-sm text-foreground">{formatCurrency(worker.month_salary)}</span></div>
                </div>

                {worker.role === "worker" ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => navigate(`/worker/${worker.id}/history`)}
                      className="rounded-md border border-input px-3 py-2 text-xs font-medium hover:bg-muted"
                    >
                      History
                    </button>
                    <button
                      type="button"
                      onClick={() => submitQuickAttendance(worker, "half_day")}
                      className="rounded-md border border-input px-3 py-2 text-xs font-medium hover:bg-muted"
                    >
                      Half Day
                    </button>
                    {userRole === "admin" ? (
                      <>
                        <button
                          type="button"
                          disabled={weekendDay !== todayWeekday}
                          onClick={() => submitQuickAttendance(worker, "weekend")}
                          className="rounded-md border border-input px-3 py-2 text-xs font-medium hover:bg-muted disabled:opacity-50"
                        >
                          Weekend
                        </button>
                        <button
                          type="button"
                          disabled={weekendDay !== todayWeekday}
                          onClick={() => submitQuickAttendance(worker, "half_weekend")}
                          className="rounded-md border border-input px-3 py-2 text-xs font-medium hover:bg-muted disabled:opacity-50"
                        >
                          Half Weekend
                        </button>
                      </>
                    ) : null}
                  </div>
                ) : null}

                <div className="mt-3 flex flex-wrap gap-2">
                  <button type="button" onClick={() => handleEditWorker(worker)} className="rounded-md border border-input px-3 py-2 text-xs font-medium hover:bg-muted">Edit</button>
                  <button
                    type="button"
                    disabled={Number(worker.id) === Number(currentUserId)}
                    onClick={() => handleDeleteWorker(worker)}
                    className="rounded-md border border-destructive/50 px-3 py-2 text-xs font-medium text-destructive hover:bg-destructive/10 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
            {!loading && filteredWorkers.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">No workers found.</p>
            ) : null}
          </div>
        </div>

        <div className="rounded-lg border border-border/60">
          <div className="border-b border-border/60 px-4 py-3">
            <h2 className="text-sm font-semibold text-foreground">Monthly Attendance History</h2>
            <p className="text-xs text-muted-foreground">Everyone together for {summaryMonth}</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full table-fixed text-sm">
              <thead className="bg-muted/30 text-left">
                <tr>
                  <th className="w-[18%] px-3 py-2">Worker</th>
                  <th className="w-[10%] px-3 py-2">Present</th>
                  <th className="w-[10%] px-3 py-2">Half Day</th>
                  <th className="w-[10%] px-3 py-2">Weekend</th>
                  <th className="w-[12%] px-3 py-2">Half Weekend</th>
                  <th className="w-[10%] px-3 py-2">Absent</th>
                  <th className="w-[12%] px-3 py-2">Days</th>
                  <th className="w-[18%] px-3 py-2">Month Salary</th>
                </tr>
              </thead>
              <tbody>
                {monthlySummaryRows.map((worker) => (
                  <tr key={worker.id} className="border-t border-border/50">
                    <td className="px-3 py-2">
                      <span className="block truncate font-medium text-foreground">{worker.name}</span>
                      <span className="block truncate text-xs text-muted-foreground">{worker.username}</span>
                    </td>
                    <td className="px-3 py-2">{worker.present_count}</td>
                    <td className="px-3 py-2">{worker.half_day_count}</td>
                    <td className="px-3 py-2">{worker.weekend_count}</td>
                    <td className="px-3 py-2">{worker.half_weekend_count}</td>
                    <td className="px-3 py-2">{worker.absent_count}</td>
                    <td className="px-3 py-2">{Number(worker.attendance_days || 0).toFixed(1)}</td>
                    <td className="px-3 py-2">{formatCurrency(worker.month_salary || 0)}</td>
                  </tr>
                ))}
                {!summaryLoading && !monthlySummaryRows.length ? (
                  <tr>
                    <td colSpan={8} className="px-3 py-6 text-center text-sm text-muted-foreground">
                      No monthly history found.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-lg border border-border/60">
          <div className="border-b border-border/60 px-4 py-3">
            <h2 className="text-sm font-semibold text-foreground">Yearly Attendance Days</h2>
            <p className="text-xs text-muted-foreground">Who came in each month of {summaryYear} and how many days</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1100px] table-fixed text-sm">
              <thead className="bg-muted/30 text-left">
                <tr>
                  <th className="w-[18%] px-3 py-2">Worker</th>
                  {Array.from({ length: 12 }, (_, index) => (
                    <th key={index} className="px-3 py-2">{String(index + 1).padStart(2, "0")}</th>
                  ))}
                  <th className="w-[10%] px-3 py-2">Total</th>
                </tr>
              </thead>
              <tbody>
                {yearlySummaryRows.map((worker) => (
                  <tr key={worker.id} className="border-t border-border/50">
                    <td className="px-3 py-2">
                      <span className="block truncate font-medium text-foreground">{worker.name}</span>
                      <span className="block truncate text-xs text-muted-foreground">{worker.username}</span>
                    </td>
                    {worker.months.map((monthRow) => (
                      <td key={monthRow.month} className="px-3 py-2">
                        {Number(monthRow.attendance_days || 0).toFixed(1)}
                      </td>
                    ))}
                    <td className="px-3 py-2 font-medium">{Number(worker.total_attendance_days || 0).toFixed(1)}</td>
                  </tr>
                ))}
                {!summaryLoading && !yearlySummaryRows.length ? (
                  <tr>
                    <td colSpan={14} className="px-3 py-6 text-center text-sm text-muted-foreground">
                      No yearly attendance history found.
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

export default Workers;
