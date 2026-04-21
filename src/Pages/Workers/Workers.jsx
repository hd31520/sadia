import { useEffect, useMemo, useState } from "react";
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
import { MoreVertical } from "lucide-react";

const isPresentLikeStatus = (status) =>
  ["present", "late", "weekend", "half_day", "half_weekend"].includes(status);

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
  const today = new Date().toISOString().slice(0, 10);
  const todayWeekday = new Date().toLocaleDateString("en-US", { weekday: "long" }).toLowerCase();
  const [workers, setWorkers] = useState([]);
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

  useEffect(() => {
    let active = true;

    const loadWorkers = async () => {
      try {
        setLoading(true);
        if (active) {
          await refreshWorkers();
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

  const stats = useMemo(() => {
    const presentToday = workers.reduce((sum, worker) => sum + Number(worker.present_day_count || 0), 0);
    const presentMonth = workers.reduce((sum, worker) => sum + Number(worker.present_count || 0), 0);
    const halfDayMonth = workers.reduce((sum, worker) => sum + Number(worker.half_day_count || 0), 0);
    const weekendMonth = workers.reduce((sum, worker) => sum + Number(worker.weekend_count || 0), 0);
    const halfWeekendMonth = workers.reduce((sum, worker) => sum + Number(worker.half_weekend_count || 0), 0);
    const absentMonth = workers.reduce((sum, worker) => sum + Number(worker.absent_count || 0), 0);

    return [
      { label: "Total Workers", value: String(workers.length), hint: "Registered worker accounts" },
      { label: "Present Today", value: String(presentToday), hint: "Today present + late count" },
      { label: "Month Salary", value: formatCurrency(workers.reduce((sum, w) => sum + Number(w.month_salary || 0), 0)), hint: "Weighted by present, half day, weekend, and half weekend" },
      { label: "Half Day", value: String(halfDayMonth), hint: "Current month half-day count" },
      { label: "Weekend", value: String(weekendMonth), hint: "Current month weekend count" },
      { label: "Half Weekend", value: String(halfWeekendMonth), hint: "Current month half-weekend count" },
      { label: "Month Absent", value: String(absentMonth), hint: "Absences in current month" },
      { label: "Month Present", value: String(presentMonth), hint: "Present + late in current month" },
    ];
  }, [workers]);

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
      const created = await apiPost("/api/users", {
        username: form.username.trim(),
        password: form.password,
        name: form.name.trim(),
        role: form.role,
        daily_salary: salary,
      });

      setWorkers((prev) => [
        {
          ...created,
          present_day_count: 0,
          present_count: 0,
          half_day_count: 0,
          weekend_count: 0,
          half_weekend_count: 0,
          absent_count: 0,
          month_salary: 0,
        },
        ...prev,
      ]);
      setForm({ username: "", password: "", name: "", role: "worker", monthly_salary: "" });
      setOpen(false);
    } catch (err) {
      setSubmitError(err.message || "Failed to add worker");
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditWorker = async (worker) => {
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
    if (!activeWorker) return;

    setEditError("");
    const monthlySalary = Number(editForm.monthly_salary || 0);
    if (Number.isNaN(monthlySalary) || monthlySalary < 0) {
      setEditError("Monthly salary must be a non-negative number.");
      return;
    }

    const nextSalary = monthlySalary > 0 ? monthlySalary / 30 : 0;

    try {
      setEditing(true);
      const updated = await apiPut(`/api/users/${activeWorker.id}`, {
        name: editForm.name.trim() || activeWorker.name,
        role: editForm.role,
        daily_salary: nextSalary,
      });

      setWorkers((prev) =>
        prev.map((entry) =>
          entry.id === activeWorker.id
            ? {
                ...entry,
                ...updated,
                month_salary:
                  Number(updated.daily_salary || 0) *
                  (Number(entry.present_count || 0) +
                    Number(entry.weekend_count || 0) +
                    Number(entry.half_day_count || 0) * 0.5 +
                    Number(entry.half_weekend_count || 0) * 0.5),
              }
            : entry
        )
      );
      setEditOpen(false);
      setActiveWorker(null);
    } catch (err) {
      setEditError(err.message || "Failed to update worker");
    } finally {
      setEditing(false);
    }
  };

  const handleDeleteWorker = async (worker) => {
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

      setWorkers((prev) =>
        prev.map((entry) =>
          entry.id === worker.id
            ? {
                ...entry,
                today_status: status,
                present_day_count: isPresentLikeStatus(status) ? 1 : 0,
              }
            : entry
        )
      );

      await refreshWorkers();
    } catch (err) {
      setAttendanceError(err.message || "Failed to save attendance");
    } finally {
      setAttendanceSubmitting(false);
    }
  };

  const confirmDeleteWorker = async () => {
    if (!activeWorker) return;

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
      setDeleteOpen(false);
      setActiveWorker(null);
    } catch (err) {
      setError(err.message || "Failed to delete worker");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <SectionPage
      title="Worker"
      description="Add workers with role and monthly salary, then monitor attendance and salary totals."
      stats={stats}
      loading={loading}
      error={error}
    >
      <div className="space-y-4">
        <div className="flex justify-end">
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
              Weekend actions are enabled only when today matches the selected weekend day.
            </p>
          </div>
        ) : null}

        <div className="space-y-4">
          <div className="rounded-lg border border-border/60">
            <div className="hidden md:block">
              <table className="w-full table-fixed text-sm">
                <thead className="bg-muted/30 text-left">
                  <tr>
                    <th className="w-[14%] px-3 py-2">Name</th>
                    <th className="w-[12%] px-3 py-2">Username</th>
                    <th className="w-[10%] px-3 py-2">Role</th>
                    <th className="w-[9%] px-3 py-2">Today</th>
                    <th className="w-[9%] px-3 py-2">Present Day</th>
                    <th className="w-[8%] px-3 py-2">Present</th>
                    <th className="w-[8%] px-3 py-2">Half Day</th>
                    <th className="w-[8%] px-3 py-2">Absent</th>
                    <th className="w-[10%] px-3 py-2">Daily Salary</th>
                    <th className="w-[10%] px-3 py-2">Month Salary</th>
                    <th className="w-[16%] px-3 py-2">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {workers.map((worker) => (
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
                      <td className="px-3 py-2 whitespace-nowrap">{worker.present_day_count}</td>
                      <td className="px-3 py-2 whitespace-nowrap">{worker.present_count}</td>
                      <td className="px-3 py-2 whitespace-nowrap">{worker.half_day_count || 0}</td>
                      <td className="px-3 py-2 whitespace-nowrap">{worker.absent_count}</td>
                      <td className="px-3 py-2 whitespace-nowrap">{formatCurrency(worker.daily_salary)}</td>
                      <td className="px-3 py-2 font-medium whitespace-nowrap">{formatCurrency(worker.month_salary)}</td>
                      <td className="px-3 py-2">
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
                              {userRole === "admin" ? (
                                <>
                                    {worker.role === "worker" ? (
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
                                </>
                              ) : null}
                              <button type="button" onClick={() => { handleEditWorker(worker); setMenuOpenId(null); }} className="block w-full rounded-md px-3 py-2 text-left text-xs font-medium hover:bg-muted">Edit</button>
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
                      </td>
                    </tr>
                  ))}
                  {!loading && workers.length === 0 ? (
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
              {workers.map((worker) => (
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
                    <div className="rounded-md bg-muted/40 p-2"><span className="block text-[11px] uppercase">Present Day</span><span className="text-sm text-foreground">{worker.present_day_count}</span></div>
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
              {!loading && workers.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">No workers found.</p>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </SectionPage>
  );
}

export default Workers;

