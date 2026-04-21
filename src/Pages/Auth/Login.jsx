import { useState } from "react";
import { Navigate, useNavigate } from "react-router";
import AuthShell from "./AuthShell";
import { publicPost, setAuthSession, getAuthToken } from "../../lib/api";

function Login() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ username: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (getAuthToken()) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    if (!form.username.trim() || !form.password.trim()) {
      setError("Username and password are required.");
      return;
    }

    try {
      setLoading(true);
      const payload = await publicPost("/api/auth/login", {
        username: form.username.trim(),
        password: form.password,
      });

      setAuthSession(payload);
      navigate("/dashboard", { replace: true });
    } catch (err) {
      setError(err.message || "Failed to log in");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      title="Welcome back"
      description="Log in to manage sales, workers, products, attendance, and salary data."
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <label className="block text-sm text-muted-foreground">
          Username
          <input
            name="username"
            value={form.username}
            onChange={handleChange}
            className="mt-1 w-full rounded-xl border border-input bg-background px-4 py-3 text-sm text-foreground"
            placeholder="admin"
            autoComplete="username"
          />
        </label>

        <label className="block text-sm text-muted-foreground">
          Password
          <input
            name="password"
            type="password"
            value={form.password}
            onChange={handleChange}
            className="mt-1 w-full rounded-xl border border-input bg-background px-4 py-3 text-sm text-foreground"
            placeholder="Password"
            autoComplete="current-password"
          />
        </label>

        {error ? <p className="text-sm text-destructive">{error}</p> : null}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
        >
          {loading ? "Signing in..." : "Sign in"}
        </button>
      </form>
    </AuthShell>
  );
}

export default Login;
