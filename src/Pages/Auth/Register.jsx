import { useState } from "react";
import { Navigate, useNavigate, Link } from "react-router";
import AuthShell from "./AuthShell";
import { publicPost, setAuthSession, getAuthToken } from "../../lib/api";

function Register() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", username: "", password: "", role: "worker" });
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

    if (!form.name.trim() || !form.username.trim() || !form.password.trim()) {
      setError("Name, username and password are required.");
      return;
    }

    try {
      setLoading(true);
      const payload = await publicPost("/api/auth/register", {
        name: form.name.trim(),
        username: form.username.trim(),
        password: form.password,
        role: form.role,
        daily_salary: 0,
      });

      setAuthSession(payload);
      navigate("/dashboard", { replace: true });
    } catch (err) {
      setError(err.message || "Failed to register");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      title="Create account"
      description="Register a new admin or worker account, then start using the POS app immediately."
      footer={
        <p>
          Already have an account? <Link to="/login" className="font-medium text-primary hover:underline">Sign in</Link>
        </p>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <label className="block text-sm text-muted-foreground">
          Name
          <input
            name="name"
            value={form.name}
            onChange={handleChange}
            className="mt-1 w-full rounded-xl border border-input bg-background px-4 py-3 text-sm text-foreground"
            placeholder="Full name"
            autoComplete="name"
          />
        </label>

        <label className="block text-sm text-muted-foreground">
          Username
          <input
            name="username"
            value={form.username}
            onChange={handleChange}
            className="mt-1 w-full rounded-xl border border-input bg-background px-4 py-3 text-sm text-foreground"
            placeholder="username"
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
            placeholder="Create a password"
            autoComplete="new-password"
          />
        </label>

        <label className="block text-sm text-muted-foreground">
          Role
          <select
            name="role"
            value={form.role}
            onChange={handleChange}
            className="mt-1 w-full rounded-xl border border-input bg-background px-4 py-3 text-sm text-foreground"
          >
            <option value="worker">Worker</option>
            <option value="admin">Admin</option>
          </select>
        </label>

        {error ? <p className="text-sm text-destructive">{error}</p> : null}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
        >
          {loading ? "Creating account..." : "Register"}
        </button>
      </form>
    </AuthShell>
  );
}

export default Register;
