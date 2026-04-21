import { useState } from "react";
import { Upload, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog";
import { uploadImageToImgbb } from "../lib/imgbb";
import { apiGet, apiPost } from "../lib/api";

export function AddProductDialog({ onProductAdded }) {
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [loadingSuppliers, setLoadingSuppliers] = useState(false);
  const [error, setError] = useState("");
  const [imagePreview, setImagePreview] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [suppliers, setSuppliers] = useState([]);
  const [showAddSupplier, setShowAddSupplier] = useState(false);
  const [addingSupplier, setAddingSupplier] = useState(false);
  const [supplierError, setSupplierError] = useState("");

  const [form, setForm] = useState({
    name: "",
    description: "",
    cost_price: "",
    price: "",
    stock: "",
    unit_type: "piece",
    barcode: "",
    supplier_id: "",
  });

  const [supplierForm, setSupplierForm] = useState({
    name: "",
    company_name: "",
    phone: "",
  });

  const loadSuppliers = async () => {
    try {
      setLoadingSuppliers(true);
      const payload = await apiGet("/api/suppliers");
      setSuppliers(payload);
    } catch {
      // Supplier list is optional for rendering the product form.
    } finally {
      setLoadingSuppliers(false);
    }
  };

  const handleDialogOpenChange = (nextOpen) => {
    setOpen(nextOpen);
    if (nextOpen) {
      loadSuppliers();
    }
  };

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSupplierChange = (event) => {
    const { name, value } = event.target;
    setSupplierForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleImageSelect = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setError("");
    setUploading(true);

    try {
      // Show preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target?.result);
      };
      reader.readAsDataURL(file);

      // Upload to imgbb
      const result = await uploadImageToImgbb(file);
      setImageUrl(result.url);
    } catch (err) {
      setError(err.message || "Failed to upload image");
      setImagePreview("");
      setImageUrl("");
    } finally {
      setUploading(false);
    }
  };

  const removeImage = () => {
    setImagePreview("");
    setImageUrl("");
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    try {
      setSubmitting(true);
      const payload = {
        name: form.name.trim(),
        description: form.description.trim() || null,
        cost_price: Number(form.cost_price),
        price: Number(form.price),
        stock: Number(form.stock || 0),
        unit_type: form.unit_type,
        image_url: imageUrl || null,
        barcode: form.barcode.trim() || undefined,
        supplier_id: form.supplier_id ? Number(form.supplier_id) : null,
      };

      if (!payload.name || Number.isNaN(payload.cost_price) || Number.isNaN(payload.price)) {
        setError("Name, buy price, and selling price are required.");
        return;
      }

      const created = await apiPost("/api/products", payload);
      
      // Reset form
      setForm({
        name: "",
        description: "",
        cost_price: "",
        price: "",
        stock: "",
        unit_type: "piece",
        barcode: "",
        supplier_id: "",
      });
      setImagePreview("");
      setImageUrl("");
      setOpen(false);
      
      // Notify parent
      if (onProductAdded) {
        onProductAdded(created);
      }
    } catch (err) {
      setError(err.message || "Failed to add product");
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddSupplier = async () => {
    setSupplierError("");

    if (!supplierForm.name.trim()) {
      setSupplierError("Supplier name is required.");
      return;
    }

    try {
      setAddingSupplier(true);
      const createdSupplier = await apiPost("/api/suppliers", {
        name: supplierForm.name.trim(),
        company_name: supplierForm.company_name.trim() || null,
        phone: supplierForm.phone.trim() || null,
      });

      setSuppliers((prev) => [createdSupplier, ...prev]);
      setForm((prev) => ({ ...prev, supplier_id: String(createdSupplier.id) }));
      setSupplierForm({ name: "", company_name: "", phone: "" });
      setShowAddSupplier(false);
    } catch (err) {
      setSupplierError(err.message || "Failed to add supplier");
    } finally {
      setAddingSupplier(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleDialogOpenChange}>
      <DialogTrigger asChild>
        <button className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
          Add Product
        </button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add New Product</DialogTitle>
          <DialogDescription>
            Fill in the product details and upload an image from imgbb.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Image Upload */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">
              Product Image
            </label>
            
            {imagePreview ? (
              <div className="relative flex items-center justify-center rounded-lg border border-border/60 bg-muted/30 p-4">
                <img
                  src={imagePreview}
                  alt="Preview"
                  className="max-h-40 max-w-full rounded-md"
                />
                <button
                  type="button"
                  onClick={removeImage}
                  disabled={uploading}
                  className="absolute -right-2 -top-2 rounded-full bg-destructive p-1 text-destructive-foreground hover:bg-destructive/90 disabled:opacity-60"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <label className="flex cursor-pointer items-center justify-center rounded-lg border-2 border-dashed border-border/60 bg-muted/20 px-4 py-6 transition-colors hover:border-primary/50 hover:bg-muted/40">
                <div className="text-center">
                  <Upload className="mx-auto h-8 w-8 text-muted-foreground" />
                  <p className="mt-1 text-xs text-muted-foreground">
                    {uploading ? "Uploading..." : "Click to upload image"}
                  </p>
                </div>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageSelect}
                  disabled={uploading}
                  className="hidden"
                />
              </label>
            )}
          </div>

          {/* Name */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-foreground">
              Product Name *
            </label>
            <input
              name="name"
              value={form.name}
              onChange={handleChange}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground"
              placeholder="Enter product name"
              required
            />
          </div>

          {/* Description */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-foreground">
              Description (optional)
            </label>
            <textarea
              name="description"
              value={form.description}
              onChange={handleChange}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground"
              placeholder="Enter product description"
              rows={3}
            />
          </div>

          {/* Prices */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-medium text-foreground">
                Buy Price *
              </label>
              <input
                name="cost_price"
                type="number"
                min="0"
                step="0.01"
                value={form.cost_price}
                onChange={handleChange}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground"
                placeholder="0.00"
                required
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-foreground">
                Selling Price *
              </label>
              <input
                name="price"
                type="number"
                min="0"
                step="0.01"
                value={form.price}
                onChange={handleChange}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground"
                placeholder="0.00"
                required
              />
            </div>
          </div>

          {/* Stock and Barcode */}
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-medium text-foreground">
                Stock Quantity
              </label>
              <input
                name="stock"
                type="number"
                min="0"
                step="1"
                value={form.stock}
                onChange={handleChange}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground"
                placeholder="0"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-foreground">
                Unit
              </label>
              <select
                name="unit_type"
                value={form.unit_type}
                onChange={handleChange}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
              >
                <option value="piece">Piece</option>
                <option value="dozen">Dozen</option>
                <option value="set">Set</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-foreground">
                Barcode (optional)
              </label>
              <input
                name="barcode"
                value={form.barcode}
                onChange={handleChange}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground"
                placeholder="Auto-generated if empty"
              />
            </div>
          </div>

          <div className="space-y-2 rounded-md border border-border/60 p-3">
            <div className="flex items-center justify-between gap-2">
              <label className="text-xs font-medium text-foreground">Supplier</label>
              <button
                type="button"
                onClick={() => {
                  setShowAddSupplier((prev) => !prev);
                  setSupplierError("");
                }}
                className="text-xs font-medium text-primary underline-offset-4 hover:underline"
              >
                {showAddSupplier ? "Cancel" : "Supplier not found? Add supplier"}
              </button>
            </div>

            <select
              name="supplier_id"
              value={form.supplier_id}
              onChange={handleChange}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
              disabled={loadingSuppliers}
            >
              <option value="">Select supplier (optional)</option>
              {suppliers.map((supplier) => (
                <option key={supplier.id} value={supplier.id}>
                  {supplier.name}
                  {supplier.company_name ? ` - ${supplier.company_name}` : ""}
                </option>
              ))}
            </select>

            {showAddSupplier ? (
              <div className="space-y-2 rounded-md border border-border/50 bg-muted/20 p-3">
                <input
                  name="name"
                  value={supplierForm.name}
                  onChange={handleSupplierChange}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
                  placeholder="Supplier name"
                  required
                />
                <input
                  name="company_name"
                  value={supplierForm.company_name}
                  onChange={handleSupplierChange}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
                  placeholder="Company name"
                />
                <input
                  name="phone"
                  value={supplierForm.phone}
                  onChange={handleSupplierChange}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
                  placeholder="Supplier number"
                />

                {supplierError ? <p className="text-xs text-destructive">{supplierError}</p> : null}

                <button
                  type="button"
                  onClick={handleAddSupplier}
                  disabled={addingSupplier}
                  className="rounded-md border border-input px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted disabled:opacity-60"
                >
                  {addingSupplier ? "Adding Supplier..." : "Add Supplier"}
                </button>
              </div>
            ) : null}
          </div>

          {/* Error */}
          {error && (
            <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          )}

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
              disabled={submitting || uploading}
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60"
            >
              {submitting ? "Adding Product..." : "Add Product"}
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

