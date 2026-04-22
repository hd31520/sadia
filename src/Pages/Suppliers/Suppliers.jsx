import { useEffect, useMemo, useState } from "react";
import SectionPage from "../Shared/SectionPage";
import { apiDelete, apiGet, apiPost, apiPut, formatCurrency } from "../../lib/api";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../../components/ui/dialog";

function Suppliers() {
  const [suppliers, setSuppliers] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [open, setOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [activeSupplier, setActiveSupplier] = useState(null);
  const [editError, setEditError] = useState("");
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [form, setForm] = useState({
    name: "",
    company_name: "",
    phone: "",
  });
  const [editForm, setEditForm] = useState({
    name: "",
    company_name: "",
    phone: "",
  });

  useEffect(() => {
    let active = true;

    const loadSuppliers = async () => {
      try {
        setLoading(true);
        const payload = await apiGet("/api/suppliers");
        if (active) {
          setSuppliers(payload);
          setError("");
        }
      } catch (err) {
        if (active) {
          setError(err.message || "Failed to load suppliers");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    loadSuppliers();

    return () => {
      active = false;
    };
  }, []);

  const stats = useMemo(() => {
    const totalAmount = suppliers.reduce((sum, supplier) => sum + Number(supplier.total_amount || 0), 0);
    const activeSuppliers = suppliers.filter((supplier) => Number(supplier.product_count || 0) > 0).length;

    return [
      { label: "Total Suppliers", value: String(suppliers.length), hint: "All registered suppliers" },
      { label: "Active Suppliers", value: String(activeSuppliers), hint: "Suppliers linked to products" },
      { label: "Total Amount", value: formatCurrency(totalAmount), hint: "Calculated from stock x buy price" },
    ];
  }, [suppliers]);

  const filteredSuppliers = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) {
      return suppliers;
    }

    return suppliers.filter((supplier) => {
      const searchableValues = [
        supplier.name,
        supplier.company_name,
        supplier.phone,
        String(supplier.product_count ?? ""),
        String(supplier.total_amount ?? ""),
      ];

      return searchableValues.some((value) => String(value || "").toLowerCase().includes(query));
    });
  }, [suppliers, searchTerm]);

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

    if (!form.name.trim()) {
      setSubmitError("Supplier name is required.");
      return;
    }

    try {
      setSubmitting(true);
      const created = await apiPost("/api/suppliers", {
        name: form.name.trim(),
        company_name: form.company_name.trim() || null,
        phone: form.phone.trim() || null,
      });

      setSuppliers((prev) => [
        {
          ...created,
          total_amount: 0,
          product_count: 0,
        },
        ...prev,
      ]);
      setForm({ name: "", company_name: "", phone: "" });
      setOpen(false);
    } catch (err) {
      setSubmitError(err.message || "Failed to add supplier");
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditSupplier = async (supplier) => {
    setActiveSupplier(supplier);
    setEditForm({
      name: supplier.name || "",
      company_name: supplier.company_name || "",
      phone: supplier.phone || "",
    });
    setEditError("");
    setEditOpen(true);
  };

  const handleUpdateSupplier = async (event) => {
    event.preventDefault();
    if (!activeSupplier) return;

    if (!editForm.name.trim()) {
      setEditError("Supplier name is required.");
      return;
    }

    try {
      setEditing(true);
      const updated = await apiPut(`/api/suppliers/${activeSupplier.id}`, {
        name: editForm.name.trim(),
        company_name: editForm.company_name.trim() || null,
        phone: editForm.phone.trim() || null,
      });

      setSuppliers((prev) =>
        prev.map((entry) =>
          entry.id === activeSupplier.id
            ? { ...entry, ...updated }
            : entry
        )
      );
      setEditOpen(false);
      setActiveSupplier(null);
    } catch (err) {
      setEditError(err.message || "Failed to update supplier");
    } finally {
      setEditing(false);
    }
  };

  const handleDeleteSupplier = async (supplier) => {
    setActiveSupplier(supplier);
    setDeleteOpen(true);
  };

  const confirmDeleteSupplier = async () => {
    if (!activeSupplier) return;
    try {
      setDeleting(true);
      await apiDelete(`/api/suppliers/${activeSupplier.id}`);
      setSuppliers((prev) => prev.filter((entry) => entry.id !== activeSupplier.id));
      setDeleteOpen(false);
      setActiveSupplier(null);
    } catch (err) {
      setError(err.message || "Failed to delete supplier");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <SectionPage
      title="Supplier"
      description="Manage supplier details and due calculation from current stock value."
      stats={stats}
      loading={loading}
      error={error}
    >
      <div className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <input
            type="search"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Search supplier, company, phone..."
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground sm:max-w-sm"
          />
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <button className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
                Add Supplier
              </button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>Add Supplier</DialogTitle>
                <DialogDescription>Enter supplier name, company name, and supplier number.</DialogDescription>
              </DialogHeader>

              <form onSubmit={handleSubmit} className="space-y-3">
                <label className="block text-xs text-muted-foreground">
                  Supplier Name
                  <input
                    name="name"
                    value={form.name}
                    onChange={handleChange}
                    className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
                    placeholder="Supplier name"
                    required
                  />
                </label>

                <label className="block text-xs text-muted-foreground">
                  Company Name
                  <input
                    name="company_name"
                    value={form.company_name}
                    onChange={handleChange}
                    className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
                    placeholder="Company name"
                  />
                </label>

                <label className="block text-xs text-muted-foreground">
                  Supplier Number
                  <input
                    name="phone"
                    value={form.phone}
                    onChange={handleChange}
                    className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
                    placeholder="Phone number"
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
                    {submitting ? "Adding..." : "Add Supplier"}
                  </button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <Dialog open={editOpen} onOpenChange={setEditOpen}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Edit Supplier</DialogTitle>
              <DialogDescription>Update supplier information.</DialogDescription>
            </DialogHeader>

            <form onSubmit={handleUpdateSupplier} className="space-y-3">
              <label className="block text-xs text-muted-foreground">
                Supplier Name
                <input
                  name="name"
                  value={editForm.name}
                  onChange={handleEditChange}
                  className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
                  required
                />
              </label>

              <label className="block text-xs text-muted-foreground">
                Company Name
                <input
                  name="company_name"
                  value={editForm.company_name}
                  onChange={handleEditChange}
                  className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
                />
              </label>

              <label className="block text-xs text-muted-foreground">
                Supplier Number
                <input
                  name="phone"
                  value={editForm.phone}
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
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Delete Supplier</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete {activeSupplier?.name || "this supplier"}?
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
                onClick={confirmDeleteSupplier}
                disabled={deleting}
                className="rounded-md bg-destructive px-4 py-2 text-sm font-medium text-destructive-foreground disabled:opacity-60"
              >
                {deleting ? "Deleting..." : "Delete"}
              </button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <div className="overflow-x-auto rounded-lg border border-border/60">
          <table className="w-full min-w-full text-sm">
            <thead className="bg-muted/30 text-left">
              <tr>
                <th className="px-3 py-2">Supplier Name</th>
                <th className="px-3 py-2">Company Name</th>
                <th className="px-3 py-2">Supplier Number</th>
                <th className="px-3 py-2">Products</th>
                <th className="px-3 py-2">Calculative Amount</th>
                <th className="px-3 py-2">Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredSuppliers.map((supplier) => (
                <tr key={supplier.id} className="border-t border-border/50">
                  <td className="px-3 py-2">{supplier.name}</td>
                  <td className="px-3 py-2">{supplier.company_name || "-"}</td>
                  <td className="px-3 py-2">{supplier.phone || "-"}</td>
                  <td className="px-3 py-2">{supplier.product_count}</td>
                  <td className="px-3 py-2 font-medium">{formatCurrency(supplier.total_amount)}</td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleEditSupplier(supplier)}
                        className="rounded-md border border-input px-2.5 py-1 text-xs font-medium hover:bg-muted"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteSupplier(supplier)}
                        className="rounded-md border border-destructive/50 px-2.5 py-1 text-xs font-medium text-destructive hover:bg-destructive/10"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {!loading && filteredSuppliers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-3 py-6 text-center text-sm text-muted-foreground">
                    No suppliers found.
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

export default Suppliers;

