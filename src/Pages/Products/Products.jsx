import { useEffect, useMemo, useState } from "react";
import SectionPage from "../Shared/SectionPage";
import { apiDelete, apiGet, apiPut, formatCurrency, getStoredUser } from "../../lib/api";
import { AddProductDialog } from "../../components/AddProductDialog";
import { MoreVertical, Upload, X } from "lucide-react";
import { uploadImageToImgbb } from "../../lib/imgbb";
import { formatUnitLabel, UNIT_TYPE_OPTIONS } from "../../lib/units";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../components/ui/dialog";

function Products() {
  const currentUser = useMemo(() => getStoredUser(), []);
  const isAdmin = currentUser?.role === "admin";
  const [products, setProducts] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [stockFilter, setStockFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [activeProduct, setActiveProduct] = useState(null);
  const [editError, setEditError] = useState("");
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [printingBarcodeId, setPrintingBarcodeId] = useState(null);
  const [barcodePrintOpen, setBarcodePrintOpen] = useState(false);
  const [barcodePrintQty, setBarcodePrintQty] = useState("1");
  const [barcodePrintProduct, setBarcodePrintProduct] = useState(null);
  const [menuOpenId, setMenuOpenId] = useState(null);
  const [suppliers, setSuppliers] = useState([]);
  const [loadingSuppliers, setLoadingSuppliers] = useState(false);
  const [uploadingEditImage, setUploadingEditImage] = useState(false);
  const [editImagePreview, setEditImagePreview] = useState("");
  const [editForm, setEditForm] = useState({
    name: "",
    description: "",
    cost_price: "",
    price: "",
    stock: "",
    unit_type: "piece",
    barcode: "",
    supplier_id: "",
    image_url: "",
  });

  useEffect(() => {
    let active = true;

    const loadProducts = async () => {
      try {
        setLoading(true);
        const payload = await apiGet("/api/products");
        if (active) {
          setProducts(payload);
          setError("");
        }
      } catch (err) {
        if (active) {
          setError(err.message || "Failed to load products");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    loadProducts();

    return () => {
      active = false;
    };
  }, []);

  const handleProductAdded = (newProduct) => {
    setProducts((prev) => [newProduct, ...prev]);
  };

  const loadSuppliers = async () => {
    try {
      setLoadingSuppliers(true);
      const payload = await apiGet("/api/suppliers");
      setSuppliers(payload || []);
    } catch {
      setSuppliers([]);
    } finally {
      setLoadingSuppliers(false);
    }
  };

  const handleEditChange = (event) => {
    const { name, value } = event.target;
    setEditForm((prev) => ({ ...prev, [name]: value }));
    if (name === "image_url") {
      setEditImagePreview(value);
    }
  };

  const handleEditDialogChange = (nextOpen) => {
    setEditOpen(nextOpen);
    if (nextOpen) return;

    setActiveProduct(null);
    setEditError("");
    setUploadingEditImage(false);
    setEditImagePreview("");
    setEditForm({
      name: "",
      description: "",
      cost_price: "",
      price: "",
      stock: "",
      unit_type: "piece",
      barcode: "",
      supplier_id: "",
      image_url: "",
    });
  };

  const handleEditProduct = async (product) => {
    if (!isAdmin) {
      setError("Admin access required to edit products.");
      return;
    }

    await loadSuppliers();
    setActiveProduct(product);
    setEditForm({
      name: product.name || "",
      description: product.description || "",
      cost_price: String(product.cost_price || 0),
      price: String(product.price || 0),
      stock: String(product.stock || 0),
      unit_type: product.unit_type || "piece",
      barcode: product.barcode || "",
      supplier_id: product.supplier_id ? String(product.supplier_id) : "",
      image_url: product.image_url || "",
    });
    setEditImagePreview(product.image_url || "");
    setEditError("");
    setEditOpen(true);
  };

  const handleEditImageSelect = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setEditError("");
    setUploadingEditImage(true);

    try {
      const reader = new FileReader();
      reader.onload = (loadEvent) => {
        setEditImagePreview(String(loadEvent.target?.result || ""));
      };
      reader.readAsDataURL(file);

      const result = await uploadImageToImgbb(file);
      setEditForm((prev) => ({ ...prev, image_url: result.url }));
    } catch (err) {
      setEditError(err.message || "Failed to upload image");
      setEditImagePreview(editForm.image_url || "");
    } finally {
      setUploadingEditImage(false);
    }
  };

  const removeEditImage = () => {
    setEditImagePreview("");
    setEditForm((prev) => ({ ...prev, image_url: "" }));
  };

  const handleUpdateProduct = async (event) => {
    event.preventDefault();
    if (!activeProduct) return;

    if (!isAdmin) {
      setEditError("Admin access required to update products.");
      return;
    }

    const payload = {
      name: editForm.name.trim() || activeProduct.name,
      description: editForm.description.trim() || null,
      cost_price: Number(editForm.cost_price),
      price: Number(editForm.price),
      stock: Number(editForm.stock),
      unit_type: editForm.unit_type,
      barcode: editForm.barcode.trim() || activeProduct.barcode,
      supplier_id: editForm.supplier_id ? Number(editForm.supplier_id) : null,
      image_url: editForm.image_url.trim() || null,
    };

    if (
      !payload.name ||
      Number.isNaN(payload.cost_price) ||
      Number.isNaN(payload.price) ||
      Number.isNaN(payload.stock)
    ) {
      setEditError("Name, buy price, selling price, and stock must be valid.");
      return;
    }

    try {
      setEditing(true);
      const updated = await apiPut(`/api/products/${activeProduct.id}`, payload);
      setProducts((prev) => prev.map((entry) => (entry.id === activeProduct.id ? updated : entry)));
      setEditOpen(false);
      setActiveProduct(null);
      setEditImagePreview("");
    } catch (err) {
      setEditError(err.message || "Failed to update product");
    } finally {
      setEditing(false);
    }
  };

  const handleDeleteProduct = async (product) => {
    if (!isAdmin) {
      setError("Admin access required to delete products.");
      return;
    }

    setActiveProduct(product);
    setDeleteOpen(true);
  };

  const confirmDeleteProduct = async () => {
    if (!activeProduct) return;

    if (!isAdmin) {
      setError("Admin access required to delete products.");
      setDeleteOpen(false);
      setActiveProduct(null);
      return;
    }

    try {
      setDeleting(true);
      await apiDelete(`/api/products/${activeProduct.id}`);
      setProducts((prev) => prev.filter((entry) => entry.id !== activeProduct.id));
      setDeleteOpen(false);
      setActiveProduct(null);
    } catch (err) {
      setError(err.message || "Failed to delete product");
    } finally {
      setDeleting(false);
    }
  };

  const generateBarcodeDataUrl = async (barcodeText) => {
    const { default: bwipjs } = await import("bwip-js");
    const canvas = document.createElement("canvas");
    bwipjs.toCanvas(canvas, {
      bcid: "code128",
      text: String(barcodeText || ""),
      scale: 3,
      height: 12,
      includetext: true,
      textxalign: "center",
      backgroundcolor: "FFFFFF",
    });
    return canvas.toDataURL("image/png");
  };

  const printProductBarcode = async (product, quantity = 1) => {
    if (!product?.barcode) {
      setError("No barcode available for this product.");
      return;
    }

    try {
      setPrintingBarcodeId(product.id);
      const barcodeDataUrl = await generateBarcodeDataUrl(product.barcode);
      const safeQty = Math.min(Math.max(Number(quantity) || 1, 1), 200);

      const labelsHtml = Array.from({ length: safeQty }, (_, index) => `
        <div class="label ${index > 0 ? "page-break" : ""}">
          <p class="name">${product.name}</p>
          <p class="price">Price: ${String(formatCurrency(product.price || 0))}</p>
          <p class="meta">Barcode: ${product.barcode}</p>
          <img class="barcode" src="${barcodeDataUrl}" alt="${product.barcode}" />
        </div>
      `).join("");

      const printWindow = window.open("", "_blank", "width=420,height=520");
      if (!printWindow) {
        setError("Please allow popups to print barcode.");
        return;
      }

      const printableHtml = `
        <html>
          <head>
            <title>Barcode - ${product.name}</title>
            <style>
              @page { margin: 0; }
              html, body { font-family: Arial, sans-serif; margin: 0; padding: 0; color: #111; }
              .label { border: 1px solid #d4d4d4; border-radius: 8px; padding: 12px; text-align: center; box-sizing: border-box; page-break-after: always; }
              .label:last-child { page-break-after: auto; }
              .name { font-size: 22px; font-weight: 800; margin: 0 0 8px; line-height: 1.15; }
              .price { font-size: 20px; font-weight: 700; margin: 4px 0; color: #111; }
              .meta { font-size: 12px; margin: 2px 0; color: #444; }
              .barcode { margin-top: 10px; width: 100%; height: auto; }
              @media print {
                .label { border: none; border-bottom: 1px dashed #ddd; border-radius: 0; margin: 0; }
              }
            </style>
          </head>
          <body>
            ${labelsHtml}
          </body>
        </html>
      `;

      printWindow.document.open();
      printWindow.document.write(printableHtml);
      printWindow.document.close();

      await new Promise((resolve) => {
        const images = Array.from(printWindow.document.images || []);
        if (!images.length) {
          resolve();
          return;
        }

        let loaded = 0;
        const done = () => {
          loaded += 1;
          if (loaded >= images.length) {
            resolve();
          }
        };

        images.forEach((img) => {
          if (img.complete) {
            done();
            return;
          }
          img.onload = done;
          img.onerror = done;
        });

        setTimeout(resolve, 1500);
      });

      setTimeout(() => {
        printWindow.focus();
        printWindow.print();
      }, 120);
    } catch (err) {
      setError(err.message || "Failed to print barcode.");
    } finally {
      setPrintingBarcodeId(null);
    }
  };

  const openBarcodePrintDialog = (product) => {
    setError("");
    setBarcodePrintProduct(product);
    setBarcodePrintQty(String(Number(product.stock || 1) || 1));
    setBarcodePrintOpen(true);
  };

  const handleBarcodePrintSubmit = async (event) => {
    event.preventDefault();
    if (!barcodePrintProduct) return;

    const qty = Number(barcodePrintQty || 1);
    if (Number.isNaN(qty) || qty < 1) {
      setError("Sticker quantity must be at least 1.");
      return;
    }

    setBarcodePrintOpen(false);
    await printProductBarcode(barcodePrintProduct, qty);
  };

  const stats = useMemo(() => {
    const lowStock = products.filter((product) => Number(product.stock) < 10).length;
    const stockValue = products.reduce(
      (acc, product) => acc + Number(product.stock || 0) * Number(product.cost_price || 0),
      0
    );

    return [
      { label: "Total Products", value: String(products.length), hint: "All catalog items" },
      { label: "Low Stock", value: String(lowStock), hint: "Stock level below 10" },
      { label: "Stock Value", value: formatCurrency(stockValue), hint: "Based on cost price" },
    ];
  }, [products]);

  const filteredProducts = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    return products.filter((product) => {
      const stock = Number(product.stock || 0);
      const matchesQuery =
        !query ||
        [product.name, product.description, product.barcode, product.supplier_name]
          .some((value) => String(value || "").toLowerCase().includes(query));

      const matchesStock =
        stockFilter === "all" ||
        (stockFilter === "low" && stock > 0 && stock < 10) ||
        (stockFilter === "out" && stock <= 0) ||
        (stockFilter === "healthy" && stock >= 10);

      return matchesQuery && matchesStock;
    });
  }, [products, searchTerm, stockFilter]);

  const getMenuPlacementClass = (index, total) => {
    if (index < 2) {
      return "top-full mt-2";
    }

    if (index >= total - 2) {
      return "bottom-full mb-2";
    }

    return "top-full mt-2";
  };

  return (
    <SectionPage
      title="Product"
      description="Create, edit, and organize your product catalog."
      stats={stats}
      loading={loading}
      error={error}
    >
      {error && (
        <div style={{ color: "red", fontWeight: "bold", marginBottom: 16, fontSize: 18, textAlign: "center" }}>
          {error}
        </div>
      )}
      <div className="space-y-4">
        {!isAdmin ? (
          <p className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-700">
            You can browse products and print barcodes, but only admins can add, edit, or delete products.
          </p>
        ) : null}

        <div className="rounded-2xl border border-border/60 bg-card/90 p-4 shadow-[0_10px_32px_rgba(15,23,42,0.06)]">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="grid gap-3 sm:grid-cols-2 lg:w-full lg:max-w-3xl lg:grid-cols-[minmax(0,1.5fr)_minmax(0,0.7fr)]">
              <input
                type="search"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Search product, barcode, supplier or description..."
                className="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm text-foreground"
              />
              <select
                value={stockFilter}
                onChange={(event) => setStockFilter(event.target.value)}
                className="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm text-foreground"
              >
                <option value="all">All Stock</option>
                <option value="healthy">Healthy Stock</option>
                <option value="low">Low Stock</option>
                <option value="out">Out of Stock</option>
              </select>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => {
                  setSearchTerm("");
                  setStockFilter("all");
                }}
                className="rounded-xl border border-input px-4 py-2.5 text-sm font-medium hover:bg-muted"
              >
                Reset
              </button>
              {isAdmin ? (
                <AddProductDialog onProductAdded={handleProductAdded} />
              ) : (
                <button
                  type="button"
                  disabled
                  className="cursor-not-allowed rounded-md bg-primary/60 px-4 py-2 text-sm font-medium text-primary-foreground opacity-70"
                >
                  Add Product
                </button>
              )}
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
            <span className="rounded-full border border-border/60 bg-muted/20 px-3 py-1">
              Showing {filteredProducts.length} of {products.length}
            </span>
            <span className="rounded-full border border-border/60 bg-muted/20 px-3 py-1">
              Low stock: {products.filter((product) => Number(product.stock || 0) > 0 && Number(product.stock || 0) < 10).length}
            </span>
            <span className="rounded-full border border-border/60 bg-muted/20 px-3 py-1">
              Out of stock: {products.filter((product) => Number(product.stock || 0) <= 0).length}
            </span>
          </div>
        </div>

        <Dialog open={editOpen} onOpenChange={handleEditDialogChange}>
          <DialogContent className="sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle>Edit Product</DialogTitle>
              <DialogDescription>Update product information with image, supplier, barcode, pricing and stock.</DialogDescription>
            </DialogHeader>

            <form onSubmit={handleUpdateProduct} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Product Image</label>

                {editImagePreview ? (
                  <div className="relative flex items-center justify-center rounded-lg border border-border/60 bg-muted/30 p-4">
                    <img src={editImagePreview} alt="Preview" className="max-h-40 max-w-full rounded-md" />
                    <button
                      type="button"
                      onClick={removeEditImage}
                      disabled={uploadingEditImage}
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
                        {uploadingEditImage ? "Uploading..." : "Click to upload image"}
                      </p>
                    </div>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleEditImageSelect}
                      disabled={uploadingEditImage}
                      className="hidden"
                    />
                  </label>
                )}
              </div>

              <label className="block text-xs text-muted-foreground">
                Name
                <input
                  name="name"
                  value={editForm.name}
                  onChange={handleEditChange}
                  className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
                  required
                />
              </label>

              <label className="block text-xs text-muted-foreground">
                Description
                <textarea
                  name="description"
                  value={editForm.description}
                  onChange={handleEditChange}
                  rows={3}
                  className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
                  placeholder="Product description"
                />
              </label>

              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <label className="block text-xs text-muted-foreground">
                  Buy Price
                  <input
                    name="cost_price"
                    type="number"
                    min="0"
                    step="0.01"
                    value={editForm.cost_price}
                    onChange={handleEditChange}
                    className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
                  />
                </label>

                <label className="block text-xs text-muted-foreground">
                  Selling Price
                  <input
                    name="price"
                    type="number"
                    min="0"
                    step="0.01"
                    value={editForm.price}
                    onChange={handleEditChange}
                    className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
                  />
                </label>

                <label className="block text-xs text-muted-foreground">
                  Stock
                  <input
                    name="stock"
                    type="number"
                    min="0"
                    step="1"
                    value={editForm.stock}
                    onChange={handleEditChange}
                    className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
                  />
                </label>

                <label className="block text-xs text-muted-foreground">
                  Unit
                  <select
                    name="unit_type"
                    value={editForm.unit_type}
                    onChange={handleEditChange}
                    className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
                  >
                    {UNIT_TYPE_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block text-xs text-muted-foreground">
                  Barcode
                  <input
                    name="barcode"
                    value={editForm.barcode}
                    onChange={handleEditChange}
                    className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
                    placeholder="Barcode"
                  />
                </label>

                <label className="block text-xs text-muted-foreground">
                  Supplier
                  <select
                    name="supplier_id"
                    value={editForm.supplier_id}
                    onChange={handleEditChange}
                    disabled={loadingSuppliers}
                    className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
                  >
                    <option value="">Select supplier</option>
                    {suppliers.map((supplier) => (
                      <option key={supplier.id} value={supplier.id}>
                        {supplier.name}
                        {supplier.company_name ? ` - ${supplier.company_name}` : ""}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <label className="block text-xs text-muted-foreground">
                Image Link
                <input
                  name="image_url"
                  type="url"
                  value={editForm.image_url}
                  onChange={handleEditChange}
                  className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
                  placeholder="https://..."
                />
              </label>

              {editForm.image_url ? (
                <div className="rounded-md border border-border/60 bg-muted/20 p-2">
                  <img
                    src={editForm.image_url}
                    alt={editForm.name || "Product preview"}
                    className="h-28 w-full rounded-md object-contain"
                  />
                </div>
              ) : null}

              {editError ? <p className="text-sm text-destructive">{editError}</p> : null}

              <DialogFooter>
                <button
                  type="button"
                  onClick={() => handleEditDialogChange(false)}
                  className="rounded-md border border-input px-4 py-2 text-sm font-medium text-foreground hover:bg-muted"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={editing || uploadingEditImage}
                    className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60"
                  >
                    {editing ? "Saving..." : "Save"}
                </button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
          <DialogContent className="sm:max-w-xl">
            <DialogHeader>
              <DialogTitle>Delete Product</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete {activeProduct?.name || "this product"}?
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
                onClick={confirmDeleteProduct}
                disabled={deleting}
                className="rounded-md bg-destructive px-4 py-2 text-sm font-medium text-destructive-foreground disabled:opacity-60"
              >
                {deleting ? "Deleting..." : "Delete"}
              </button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={barcodePrintOpen} onOpenChange={setBarcodePrintOpen}>
          <DialogContent className="sm:max-w-xl">
            <DialogHeader>
              <DialogTitle>Print Barcode Stickers</DialogTitle>
              <DialogDescription>
                Select how many barcode stickers to print for {barcodePrintProduct?.name || "this product"}.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleBarcodePrintSubmit} className="space-y-3">
              <label className="block text-xs text-muted-foreground">
                Sticker Quantity
                <input
                  type="number"
                  min="1"
                  max="200"
                  step="1"
                  value={barcodePrintQty}
                  onChange={(event) => setBarcodePrintQty(event.target.value)}
                  className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
                />
              </label>

              <DialogFooter>
                <button
                  type="button"
                  onClick={() => setBarcodePrintOpen(false)}
                  className="rounded-md border border-input px-4 py-2 text-sm font-medium text-foreground hover:bg-muted"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!barcodePrintProduct}
                  className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60"
                >
                  Print
                </button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        <div className="rounded-lg border border-border/60">
          <div className="hidden overflow-x-auto lg:block">
            <table className="w-full table-fixed text-sm">
              <thead className="bg-muted/30 text-left">
                <tr>
                  <th className="w-[8%] px-3 py-2">Image</th>
                  <th className="w-[14%] px-3 py-2">Name</th>
                  <th className="w-[12%] px-3 py-2">Supplier</th>
                  <th className="w-[24%] px-3 py-2">Description</th>
                  <th className="w-[10%] px-3 py-2">Buy Price</th>
                  <th className="w-[10%] px-3 py-2">Selling Price</th>
                  <th className="w-[10%] px-3 py-2">Total Number</th>
                  <th className="w-[12%] px-3 py-2">Barcode</th>
                  <th className="w-[10%] px-3 py-2">Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.map((product, index) => (
                  <tr key={product.id} className="border-t border-border/50 align-top">
                    <td className="px-3 py-2">
                      {product.image_url ? (
                        <img
                          src={product.image_url}
                          alt={product.name}
                          className="h-10 w-10 rounded-md border border-border/50 object-cover"
                        />
                      ) : (
                        <div className="flex h-10 w-10 items-center justify-center rounded-md border border-dashed border-border/60 text-[10px] text-muted-foreground">
                          No Img
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-2"><span className="block truncate">{product.name}</span></td>
                    <td className="px-3 py-2"><span className="block truncate">{product.supplier_name || "-"}</span></td>
                    <td className="px-3 py-2"><span className="block max-h-10 overflow-hidden wrap-break-word">{product.description || "-"}</span></td>
                    <td className="px-3 py-2 whitespace-nowrap">{formatCurrency(product.cost_price)}</td>
                    <td className="px-3 py-2 whitespace-nowrap">{formatCurrency(product.price)}</td>
                    <td className="px-3 py-2 whitespace-nowrap">{product.stock} {formatUnitLabel(product.unit_type)}</td>
                    <td className="px-3 py-2"><span className="block truncate">{product.barcode}</span></td>
                    <td className="px-3 py-2">
                      <div className="relative inline-block text-left overflow-visible">
                        <button
                          type="button"
                          onClick={() => setMenuOpenId((current) => (current === product.id ? null : product.id))}
                          className="inline-flex items-center gap-1 rounded-md border border-input px-2.5 py-1.5 text-xs font-medium hover:bg-muted"
                        >
                          <MoreVertical className="h-4 w-4" />
                        </button>
                        {menuOpenId === product.id ? (
                          <div
                            className={`absolute right-0 top-0 z-50 w-44 rounded-lg border border-border bg-background p-1 shadow-xl ${getMenuPlacementClass(index, filteredProducts.length)}`}
                          >
                            <button type="button" onClick={() => { openBarcodePrintDialog(product); setMenuOpenId(null); }} className="block w-full rounded-md px-3 py-2 text-left text-xs font-medium hover:bg-muted">Print Barcode</button>
                            {isAdmin ? (
                              <>
                                <button type="button" onClick={() => { handleEditProduct(product); setMenuOpenId(null); }} className="block w-full rounded-md px-3 py-2 text-left text-xs font-medium hover:bg-muted">Edit</button>
                                <button type="button" onClick={() => { handleDeleteProduct(product); setMenuOpenId(null); }} className="block w-full rounded-md px-3 py-2 text-left text-xs font-medium text-destructive hover:bg-destructive/10">Delete</button>
                              </>
                            ) : null}
                          </div>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="space-y-3 p-3 lg:hidden">
                {filteredProducts.map((product) => (
              <div key={product.id} className="rounded-lg border border-border/60 bg-card p-3">
                <div className="flex items-start gap-3">
                  {product.image_url ? (
                    <img src={product.image_url} alt={product.name} className="h-14 w-14 shrink-0 rounded-md border border-border/50 object-cover" />
                  ) : (
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-md border border-dashed border-border/60 text-[10px] text-muted-foreground">No Img</div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-foreground">{product.name}</p>
                    <p className="truncate text-xs text-muted-foreground">{product.supplier_name || "-"}</p>
                    <p className="mt-1 max-h-10 overflow-hidden wrap-break-word text-xs text-muted-foreground">{product.description || "-"}</p>
                  </div>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                  <div className="rounded-md bg-muted/40 p-2"><span className="block text-[11px] uppercase">Buy Price</span><span className="text-sm text-foreground">{formatCurrency(product.cost_price)}</span></div>
                  <div className="rounded-md bg-muted/40 p-2"><span className="block text-[11px] uppercase">Sell Price</span><span className="text-sm text-foreground">{formatCurrency(product.price)}</span></div>
                  <div className="rounded-md bg-muted/40 p-2"><span className="block text-[11px] uppercase">Stock</span><span className="text-sm text-foreground">{product.stock} {formatUnitLabel(product.unit_type)}</span></div>
                  <div className="rounded-md bg-muted/40 p-2"><span className="block text-[11px] uppercase">Barcode</span><span className="block truncate text-sm text-foreground">{product.barcode}</span></div>
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  <button type="button" onClick={() => openBarcodePrintDialog(product)} disabled={printingBarcodeId === product.id} className="rounded-md border border-input px-3 py-2 text-xs font-medium hover:bg-muted disabled:opacity-60">{printingBarcodeId === product.id ? "Printing..." : "Print Barcode"}</button>
                  {isAdmin ? (
                    <>
                      <button type="button" onClick={() => handleEditProduct(product)} className="rounded-md border border-input px-3 py-2 text-xs font-medium hover:bg-muted">Edit</button>
                      <button type="button" onClick={() => handleDeleteProduct(product)} className="rounded-md border border-destructive/50 px-3 py-2 text-xs font-medium text-destructive hover:bg-destructive/10">Delete</button>
                    </>
                  ) : null}
                </div>
              </div>
            ))}
            {!loading && filteredProducts.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border/60 bg-muted/15 px-4 py-10 text-center text-sm text-muted-foreground">
                No products match this filter.
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </SectionPage>
  );
}

export default Products;

