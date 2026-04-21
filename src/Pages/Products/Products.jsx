import { useEffect, useMemo, useState } from "react";
import bwipjs from "bwip-js";
import SectionPage from "../Shared/SectionPage";
import { apiDelete, apiGet, apiPut, formatCurrency } from "../../lib/api";
import { AddProductDialog } from "../../components/AddProductDialog";
import { MoreVertical } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../components/ui/dialog";

const formatUnitLabel = (unitType) => {
  const normalized = String(unitType || "piece").toLowerCase();
  if (normalized === "dozen") return "Dozen";
  if (normalized === "set") return "Set";
  return "Piece";
};

function Products() {
  const [products, setProducts] = useState([]);
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
  const [editForm, setEditForm] = useState({
    name: "",
    cost_price: "",
    price: "",
    stock: "",
    unit_type: "piece",
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

  const handleEditChange = (event) => {
    const { name, value } = event.target;
    setEditForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleEditProduct = async (product) => {
    setActiveProduct(product);
    setEditForm({
      name: product.name || "",
      cost_price: String(product.cost_price || 0),
      price: String(product.price || 0),
      stock: String(product.stock || 0),
      unit_type: product.unit_type || "piece",
      image_url: product.image_url || "",
    });
    setEditError("");
    setEditOpen(true);
  };

  const handleUpdateProduct = async (event) => {
    event.preventDefault();
    if (!activeProduct) return;

    const payload = {
      name: editForm.name.trim() || activeProduct.name,
      cost_price: Number(editForm.cost_price),
      price: Number(editForm.price),
      stock: Number(editForm.stock),
      unit_type: editForm.unit_type,
      image_url: editForm.image_url.trim() || null,
    };

    if (
      Number.isNaN(payload.cost_price) ||
      Number.isNaN(payload.price) ||
      Number.isNaN(payload.stock)
    ) {
      setEditError("Buy price, selling price, and stock must be numbers.");
      return;
    }

    try {
      setEditing(true);
      const updated = await apiPut(`/api/products/${activeProduct.id}`, payload);
      setProducts((prev) => prev.map((entry) => (entry.id === activeProduct.id ? updated : entry)));
      setEditOpen(false);
      setActiveProduct(null);
    } catch (err) {
      setEditError(err.message || "Failed to update product");
    } finally {
      setEditing(false);
    }
  };

  const handleDeleteProduct = async (product) => {
    setActiveProduct(product);
    setDeleteOpen(true);
  };

  const confirmDeleteProduct = async () => {
    if (!activeProduct) return;
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

  const generateBarcodeDataUrl = (barcodeText) => {
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
      const barcodeDataUrl = generateBarcodeDataUrl(product.barcode);
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

  return (
    <SectionPage
      title="Product"
      description="Create, edit, and organize your product catalog."
      stats={stats}
      loading={loading}
      error={error}
    >
      {error && (
        <div style={{ color: 'red', fontWeight: 'bold', marginBottom: 16, fontSize: 18, textAlign: 'center' }}>
          {error}
        </div>
      )}
      <div className="space-y-4">
        <div className="flex justify-end">
          <AddProductDialog onProductAdded={handleProductAdded} />
        </div>

        <Dialog open={editOpen} onOpenChange={setEditOpen}>
          <DialogContent className="sm:max-w-120">
            <DialogHeader>
              <DialogTitle>Edit Product</DialogTitle>
              <DialogDescription>Update product information.</DialogDescription>
            </DialogHeader>

            <form onSubmit={handleUpdateProduct} className="space-y-3">
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

              <div className="grid grid-cols-4 gap-3">
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
                    <option value="piece">Piece</option>
                    <option value="dozen">Dozen</option>
                    <option value="set">Set</option>
                  </select>
                </label>
              </div>

              <label className="block text-xs text-muted-foreground">
                Image Link (optional)
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
          <DialogContent className="sm:max-w-105">
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
          <div className="hidden lg:block">
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
                {products.map((product) => (
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
                          <div className="absolute bottom-full right-0 z-50 mb-2 w-44 rounded-lg border border-border bg-background p-1 shadow-xl">
                            <button type="button" onClick={() => { openBarcodePrintDialog(product); setMenuOpenId(null); }} className="block w-full rounded-md px-3 py-2 text-left text-xs font-medium hover:bg-muted">Print Barcode</button>
                            <button type="button" onClick={() => { handleEditProduct(product); setMenuOpenId(null); }} className="block w-full rounded-md px-3 py-2 text-left text-xs font-medium hover:bg-muted">Edit</button>
                            <button type="button" onClick={() => { handleDeleteProduct(product); setMenuOpenId(null); }} className="block w-full rounded-md px-3 py-2 text-left text-xs font-medium text-destructive hover:bg-destructive/10">Delete</button>
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
            {products.map((product) => (
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
                  <button type="button" onClick={() => handleEditProduct(product)} className="rounded-md border border-input px-3 py-2 text-xs font-medium hover:bg-muted">Edit</button>
                  <button type="button" onClick={() => handleDeleteProduct(product)} className="rounded-md border border-destructive/50 px-3 py-2 text-xs font-medium text-destructive hover:bg-destructive/10">Delete</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </SectionPage>
  );
}

export default Products;

