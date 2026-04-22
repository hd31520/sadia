import { useEffect, useMemo, useState } from "react";
import SectionPage from "../Shared/SectionPage";
import { apiGet, apiPost, formatCurrency } from "../../lib/api";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../../components/ui/dialog";

function Customers() {
  const [customers, setCustomers] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [form, setForm] = useState({
    name: "",
    phone: "",
    address: "",
  });

  useEffect(() => {
    let active = true;

    const loadCustomers = async () => {
      try {
        setLoading(true);
        const payload = await apiGet("/api/customers");
        if (active) {
          setCustomers(payload);
          setError("");
        }
      } catch (err) {
        if (active) {
          setError(err.message || "Failed to load customers");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    loadCustomers();

    return () => {
      active = false;
    };
  }, []);

  const stats = useMemo(() => {
    const dueCustomers = customers.filter((customer) => Number(customer.due_amount || 0) > 0);
    const totalDue = dueCustomers.reduce((acc, customer) => acc + Number(customer.due_amount || 0), 0);

    return [
      { label: "Total Customers", value: String(customers.length), hint: "Active customer records" },
      { label: "With Outstanding Due", value: String(dueCustomers.length), hint: "Customers who still owe money" },
      { label: "Total Due", value: formatCurrency(totalDue), hint: "Combined due amount" },
    ];
  }, [customers]);

  const filteredCustomers = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) {
      return customers;
    }

    return customers.filter((customer) => {
      const searchableValues = [
        customer.name,
        customer.phone,
        customer.address,
        String(customer.due_amount ?? ""),
      ];

      return searchableValues.some((value) => String(value || "").toLowerCase().includes(query));
    });
  }, [customers, searchTerm]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitError("");

    if (!form.name.trim()) {
      setSubmitError("Customer name is required.");
      return;
    }

    try {
      setSubmitting(true);
      const created = await apiPost("/api/customers", {
        name: form.name.trim(),
        phone: form.phone.trim() || null,
        address: form.address.trim() || null,
      });

      setCustomers((prev) => [created, ...prev]);
      setForm({ name: "", phone: "", address: "" });
      setOpen(false);
    } catch (err) {
      setSubmitError(err.message || "Failed to add customer");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SectionPage
      title="Customer"
      description="Manage customer profiles, history, and relationships."
      stats={stats}
      loading={loading}
      error={error}
    >
      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-border/60 bg-muted/20 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Profiles</p>
            <p className="mt-2 text-2xl font-semibold text-foreground">{customers.length}</p>
            <p className="mt-1 text-xs text-muted-foreground">Customer records ready for sale linking.</p>
          </div>
          <div className="rounded-2xl border border-border/60 bg-muted/20 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Due Customers</p>
            <p className="mt-2 text-2xl font-semibold text-foreground">
              {customers.filter((customer) => Number(customer.due_amount || 0) > 0).length}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">Accounts with open balance.</p>
          </div>
          <div className="rounded-2xl border border-border/60 bg-muted/20 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Search Results</p>
            <p className="mt-2 text-2xl font-semibold text-foreground">{filteredCustomers.length}</p>
            <p className="mt-1 text-xs text-muted-foreground">Current records matching your search.</p>
          </div>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <input
            type="search"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Search name, phone, address, due..."
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground sm:max-w-sm"
          />
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <button className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
                Add Customer
              </button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>Add Customer</DialogTitle>
                <DialogDescription>Create a customer profile for sales and due tracking.</DialogDescription>
              </DialogHeader>

              <form onSubmit={handleSubmit} className="space-y-3">
                <label className="block text-xs text-muted-foreground">
                  Name
                  <input
                    name="name"
                    value={form.name}
                    onChange={handleChange}
                    className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
                    placeholder="Customer name"
                    required
                  />
                </label>

                <label className="block text-xs text-muted-foreground">
                  Phone
                  <input
                    name="phone"
                    value={form.phone}
                    onChange={handleChange}
                    className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
                    placeholder="Phone number"
                  />
                </label>

                <label className="block text-xs text-muted-foreground">
                  Address
                  <textarea
                    name="address"
                    value={form.address}
                    onChange={handleChange}
                    rows={3}
                    className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
                    placeholder="Customer address"
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
                    {submitting ? "Adding..." : "Add Customer"}
                  </button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

      <div className="overflow-x-auto rounded-2xl border border-border/60">
        <table className="w-full min-w-full text-sm">
          <thead className="bg-muted/30 text-left">
            <tr>
              <th className="px-3 py-2">Name</th>
              <th className="px-3 py-2">Phone</th>
              <th className="px-3 py-2">Address</th>
              <th className="px-3 py-2">Due</th>
            </tr>
          </thead>
          <tbody>
            {filteredCustomers.map((customer) => (
              <tr key={customer.id} className="border-t border-border/50">
                <td className="px-3 py-2">{customer.name}</td>
                <td className="px-3 py-2">{customer.phone || "-"}</td>
                <td className="px-3 py-2">{customer.address || "-"}</td>
                <td className="px-3 py-2">{formatCurrency(customer.due_amount)}</td>
              </tr>
            ))}
            {!loading && filteredCustomers.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-3 py-6 text-center text-sm text-muted-foreground">
                  No customers found.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
      </div>
    </SectionPage>
  );
}

export default Customers;

