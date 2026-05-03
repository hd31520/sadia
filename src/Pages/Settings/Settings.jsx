import { useEffect, useMemo, useState } from "react";
import SectionPage from "../Shared/SectionPage";
import { apiGet, apiPut, formatCurrency, getStoredUser, publicRequest } from "../../lib/api";
import { useTheme } from "../../components/use-theme";

const SETTINGS_KEY = "app-settings";
const LOCAL_SETTINGS_KEY = "pos_app_settings";
const WEEKEND_DAY_KEY = "pos_weekend_day";
const DEFAULT_MONTH_KEY = "pos_default_month";

const WEEKDAYS = [
  { value: "", label: "Select day" },
  { value: "saturday", label: "Saturday" },
  { value: "sunday", label: "Sunday" },
  { value: "monday", label: "Monday" },
  { value: "tuesday", label: "Tuesday" },
  { value: "wednesday", label: "Wednesday" },
  { value: "thursday", label: "Thursday" },
  { value: "friday", label: "Friday" },
];

const defaultSettings = {
  weekend_day: "",
  default_month: "",
  confirm_before_delete: true,
  confirm_before_print: true,
  compact_tables: false,
  currency_symbol: "৳",
};

const getCurrentMonth = () => new Date().toISOString().slice(0, 7);

function readLocalSettings() {
  try {
    const parsed = JSON.parse(localStorage.getItem(LOCAL_SETTINGS_KEY) || "{}");
    return { ...defaultSettings, ...parsed };
  } catch {
    return defaultSettings;
  }
}

function saveLocalSettings(settings) {
  localStorage.setItem(LOCAL_SETTINGS_KEY, JSON.stringify(settings));
  localStorage.setItem(WEEKEND_DAY_KEY, settings.weekend_day || "");
  localStorage.setItem(DEFAULT_MONTH_KEY, settings.default_month || "");
}

function Settings() {
  const user = useMemo(() => getStoredUser(), []);
  const isAdmin = user?.role === "admin";
  const { theme, setTheme } = useTheme();
  const [settings, setSettings] = useState(() => ({
    ...readLocalSettings(),
    weekend_day: localStorage.getItem(WEEKEND_DAY_KEY) || readLocalSettings().weekend_day || "",
    default_month: localStorage.getItem(DEFAULT_MONTH_KEY) || readLocalSettings().default_month || "",
  }));
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saveMessage, setSaveMessage] = useState("");
  const [serverSync, setServerSync] = useState("Local only");
  const [apiStatus, setApiStatus] = useState("Checking...");

  useEffect(() => {
    let active = true;

    const loadSettings = async () => {
      try {
        setLoading(true);
        const payload = await apiGet(`/api/preferences/${SETTINGS_KEY}`);
        if (!active) return;

        if (payload?.value && typeof payload.value === "object") {
          const nextSettings = { ...defaultSettings, ...payload.value };
          setSettings(nextSettings);
          saveLocalSettings(nextSettings);
          setServerSync("Synced");
        } else {
          setServerSync("Ready");
        }
        setError("");
      } catch (err) {
        if (active) {
          setServerSync("Local fallback");
          setError(err.message || "Settings loaded from this device only.");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    const checkApi = async () => {
      try {
        await publicRequest("/api/health");
        if (active) setApiStatus("Connected");
      } catch {
        if (active) setApiStatus("Not connected");
      }
    };

    loadSettings();
    checkApi();

    return () => {
      active = false;
    };
  }, []);

  const stats = useMemo(
    () => [
      { label: "Account", value: user?.role || "Unknown", hint: user?.name || "Current signed-in user" },
      { label: "Theme", value: theme, hint: "Saved in this browser for quick loading" },
      { label: "Settings Sync", value: serverSync, hint: "Server preference sync with local fallback" },
      { label: "API Status", value: apiStatus, hint: "Health check from the configured API target" },
      { label: "Sample Currency", value: formatCurrency(1250), hint: "Current app currency formatting preview" },
    ],
    [apiStatus, serverSync, theme, user?.name, user?.role]
  );

  const updateSetting = (key, value) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
    setSaveMessage("");
  };

  const handleSave = async () => {
    setSaving(true);
    setError("");
    setSaveMessage("");

    const nextSettings = { ...defaultSettings, ...settings };
    saveLocalSettings(nextSettings);

    try {
      await apiPut(`/api/preferences/${SETTINGS_KEY}`, { value: nextSettings });
      setServerSync("Synced");
      setSaveMessage("Settings saved to server and this device.");
    } catch (err) {
      setServerSync("Local fallback");
      setError(err.message || "Settings saved locally, but server sync failed.");
      setSaveMessage("Settings saved on this device.");
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    const nextSettings = {
      ...defaultSettings,
      default_month: getCurrentMonth(),
    };
    setSettings(nextSettings);
    saveLocalSettings(nextSettings);
    setTheme("system");
    setSaveMessage("Settings reset on this device. Save to sync with server.");
  };

  return (
    <SectionPage
      title="Settings"
      description="Reliable app preferences for display, attendance, safety prompts, and server sync."
      stats={stats}
      loading={loading}
      error={error}
    >
      <div className="space-y-5">
        <div className="grid gap-4 lg:grid-cols-2">
          <section className="rounded-lg border border-border/60 bg-muted/15 p-4">
            <div className="mb-4">
              <h2 className="text-sm font-semibold text-foreground">Display</h2>
              <p className="text-xs text-muted-foreground">These settings apply immediately on this device.</p>
            </div>

            <div className="space-y-3">
              <label className="block text-xs text-muted-foreground">
                Theme
                <select
                  value={theme}
                  onChange={(event) => setTheme(event.target.value)}
                  className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
                >
                  <option value="system">System</option>
                  <option value="light">Light</option>
                  <option value="dark">Dark</option>
                </select>
              </label>

              <label className="block text-xs text-muted-foreground">
                Default Month
                <input
                  type="month"
                  value={settings.default_month || ""}
                  onChange={(event) => updateSetting("default_month", event.target.value)}
                  className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
                />
              </label>

              <label className="flex items-center gap-3 rounded-md border border-border/60 bg-background px-3 py-2 text-sm">
                <input
                  type="checkbox"
                  checked={settings.compact_tables}
                  onChange={(event) => updateSetting("compact_tables", event.target.checked)}
                  className="h-4 w-4"
                />
                <span>
                  Compact table mode
                  <span className="block text-xs text-muted-foreground">Saved for future table density support.</span>
                </span>
              </label>
            </div>
          </section>

          <section className="rounded-lg border border-border/60 bg-muted/15 p-4">
            <div className="mb-4">
              <h2 className="text-sm font-semibold text-foreground">Attendance</h2>
              <p className="text-xs text-muted-foreground">Worker weekend marking uses this shared browser value.</p>
            </div>

            <label className="block text-xs text-muted-foreground">
              Weekend Day
              <select
                value={settings.weekend_day}
                onChange={(event) => updateSetting("weekend_day", event.target.value)}
                disabled={!isAdmin}
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground disabled:opacity-60"
              >
                {WEEKDAYS.map((day) => (
                  <option key={day.value} value={day.value}>
                    {day.label}
                  </option>
                ))}
              </select>
            </label>

            {!isAdmin ? (
              <p className="mt-3 rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-700">
                Admin access is required to change attendance settings.
              </p>
            ) : null}
          </section>
        </div>

        <section className="rounded-lg border border-border/60 bg-muted/15 p-4">
          <div className="mb-4">
            <h2 className="text-sm font-semibold text-foreground">Reliability And Safety</h2>
            <p className="text-xs text-muted-foreground">Keep risky actions deliberate and preserve a local fallback.</p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="flex items-center gap-3 rounded-md border border-border/60 bg-background px-3 py-2 text-sm">
              <input
                type="checkbox"
                checked={settings.confirm_before_delete}
                onChange={(event) => updateSetting("confirm_before_delete", event.target.checked)}
                className="h-4 w-4"
              />
              <span>
                Confirm before delete
                <span className="block text-xs text-muted-foreground">Recommended for customer, due, product, and worker records.</span>
              </span>
            </label>

            <label className="flex items-center gap-3 rounded-md border border-border/60 bg-background px-3 py-2 text-sm">
              <input
                type="checkbox"
                checked={settings.confirm_before_print}
                onChange={(event) => updateSetting("confirm_before_print", event.target.checked)}
                className="h-4 w-4"
              />
              <span>
                Confirm before print/export
                <span className="block text-xs text-muted-foreground">Helps avoid accidental print windows and exports.</span>
              </span>
            </label>
          </div>
        </section>

        <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={handleReset}
            className="rounded-md border border-input px-4 py-2 text-sm font-medium text-foreground hover:bg-muted"
          >
            Reset
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60"
          >
            {saving ? "Saving..." : "Save Settings"}
          </button>
        </div>

        {saveMessage ? <p className="text-sm text-emerald-600">{saveMessage}</p> : null}
      </div>
    </SectionPage>
  );
}

export default Settings;
