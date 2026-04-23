import { useEffect, useMemo, useState } from "react";
import SectionPage from "../Shared/SectionPage";
import { apiDelete, apiGet, apiPut, formatCurrency, getStoredUser } from "../../lib/api";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../components/ui/dialog";

const inventoryColumnColorDefaults = {
  product: "default",
  stock: "default",
  status: "default",
  cost: "default",
  action: "default",
};

const columnOptions = [
  { key: "product", label: "Product" },
  { key: "stock", label: "Stock" },
  { key: "status", label: "Status" },
  { key: "cost", label: "Cost Value" },
  { key: "action", label: "Action" },
];

const columnColorPresets = {
  default: "",
  green: "bg-emerald-500/10",
  red: "bg-rose-500/10",
  amber: "bg-amber-500/10",
  blue: "bg-sky-500/10",
};

const columnColorChoices = [
  { key: "default", label: "Default" },
  { key: "green", label: "Green" },
  { key: "red", label: "Red" },
  { key: "amber", label: "Amber" },
  { key: "blue", label: "Blue" },
];

function isCustomHexColor(value) {
  return /^#[0-9a-f]{6}$/i.test(String(value || "").trim());
}

function Inventory() {
  const currentUser = getStoredUser();
  const isAdmin = currentUser?.role === "admin";
  const [products, setProducts] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [activeProduct, setActiveProduct] = useState(null);
  const [editStock, setEditStock] = useState("");
  const [editError, setEditError] = useState("");
  const [deleteError, setDeleteError] = useState("");
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState(null);
  const [columnColors, setColumnColors] = useState(inventoryColumnColorDefaults);
  const [colorMenu, setColorMenu] = useState(null);

  useEffect(() => {
    const closeColorMenu = () => setColorMenu(null);
    window.addEventListener("click", closeColorMenu);
    return () => window.removeEventListener("click", closeColorMenu);
  }, []);

  useEffect(() => {
    let active = true;

    const loadInventory = async () => {
      try {
        setLoading(true);
        const payload = await apiGet("/api/products");
        if (active) {
          setProducts(payload);
          setError("");
        }
      } catch (err) {
        if (active) {
          setError(err.message || "Failed to load inventory");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    loadInventory();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;

    const loadColumnColors = async () => {
      try {
        const payload = await apiGet("/api/preferences/inventory-column-colors");
        const nextColors = payload?.value;

        if (
          active &&
          nextColors &&
          typeof nextColors === "object" &&
          !Array.isArray(nextColors)
        ) {
          setColumnColors((prev) => ({
            ...prev,
            ...Object.fromEntries(
              Object.entries(nextColors).filter(
                ([columnKey, colorKey]) =>
                  columnKey in inventoryColumnColorDefaults &&
                  (colorKey in columnColorPresets || isCustomHexColor(colorKey))
              )
            ),
          }));
        }
      } catch {
        // Keep local defaults if preference loading fails.
      }
    };

    loadColumnColors();

    return () => {
      active = false;
    };
  }, []);

  const lowStockItems = useMemo(
    () => products.filter((product) => Number(product.stock || 0) < 10),
    [products]
  );

  const filteredProducts = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) {
      return products;
    }

    return products.filter((product) => {
      const stock = Number(product.stock || 0);
      const searchableValues = [
        product.name,
        product.barcode,
        product.category,
        String(stock),
        stock < 10 ? "low" : "healthy",
        String(Number(product.cost_price || 0)),
      ];

      return searchableValues.some((value) => String(value || "").toLowerCase().includes(query));
    });
  }, [products, searchTerm]);

  useEffect(() => {
    if (!filteredProducts.length) {
      setSelectedProductId(null);
      return;
    }

    const hasSelection = filteredProducts.some((product) => product.id === selectedProductId);
    if (!hasSelection) {
      setSelectedProductId(filteredProducts[0].id);
    }
  }, [filteredProducts, selectedProductId]);

  const stats = useMemo(() => {
    const totalUnits = products.reduce((acc, product) => acc + Number(product.stock || 0), 0);
    const stockWorth = products.reduce(
      (acc, product) => acc + Number(product.stock || 0) * Number(product.cost_price || 0),
      0
    );

    return [
      { label: "Total Units", value: String(totalUnits), hint: "All product quantities combined" },
      { label: "Low Stock Items", value: String(lowStockItems.length), hint: "Needs restock soon" },
      { label: "Inventory Cost", value: formatCurrency(stockWorth), hint: "Estimated at cost price" },
    ];
  }, [products, lowStockItems.length]);

  const handleEditInventoryProduct = async (product) => {
    setActiveProduct(product);
    setEditStock(String(product.stock || 0));
    setEditError("");
    setEditOpen(true);
  };

  const handleUpdateStock = async (event) => {
    event.preventDefault();
    if (!activeProduct) return;

    const nextStock = Number(editStock);
    if (Number.isNaN(nextStock) || nextStock < 0) {
      setEditError("Stock must be a non-negative number.");
      return;
    }

    try {
      setEditing(true);
      const updated = await apiPut(`/api/products/${activeProduct.id}`, {
        stock: nextStock,
      });
      setProducts((prev) => prev.map((entry) => (entry.id === activeProduct.id ? updated : entry)));
      setEditOpen(false);
      setActiveProduct(null);
    } catch (err) {
      setEditError(err.message || "Failed to update stock");
    } finally {
      setEditing(false);
    }
  };

  const handleDeleteInventoryProduct = async (product) => {
    setActiveProduct(product);
    setDeleteError("");
    setDeleteOpen(true);
  };

  const confirmDeleteInventoryProduct = async () => {
    if (!activeProduct) return;
    try {
      setDeleting(true);
      setDeleteError("");
      await apiDelete(`/api/products/${activeProduct.id}`);
      setProducts((prev) => prev.filter((entry) => entry.id !== activeProduct.id));
      setDeleteOpen(false);
      setActiveProduct(null);
    } catch (err) {
      setDeleteError(err.message || "Failed to delete product");
    } finally {
      setDeleting(false);
    }
  };

  const handleInventoryWheel = (event) => {
    if (!filteredProducts.length) {
      return;
    }

    event.preventDefault();
    const currentIndex = filteredProducts.findIndex((product) => product.id === selectedProductId);
    const safeIndex = currentIndex >= 0 ? currentIndex : 0;
    const direction = event.deltaY > 0 ? 1 : -1;
    const nextIndex = Math.min(Math.max(safeIndex + direction, 0), filteredProducts.length - 1);

    setSelectedProductId(filteredProducts[nextIndex].id);
  };

  const openColumnContextMenu = (event, columnKey) => {
    event.preventDefault();
    event.stopPropagation();
    setColorMenu({
      columnKey,
      x: event.clientX,
      y: event.clientY,
    });
  };

  const setColumnColor = async (columnKey, colorKey) => {
    const nextColors = { ...columnColors, [columnKey]: colorKey };
    setColumnColors(nextColors);
    setColorMenu(null);

    try {
      await apiPut("/api/preferences/inventory-column-colors", {
        value: nextColors,
      });
    } catch {
      // Keep the chosen color in UI even if saving fails for now.
    }
  };

  const getColumnToneClassName = (columnKey) => {
    const colorValue = columnColors[columnKey];
    return colorValue in columnColorPresets ? columnColorPresets[colorValue] : "";
  };

  const getColumnToneStyle = (columnKey) => {
    const colorValue = columnColors[columnKey];
    return isCustomHexColor(colorValue) ? { backgroundColor: `${colorValue}22` } : undefined;
  };

  return (
    <SectionPage
      title="Inventory"
      description="Track stock levels, adjustments, and reorder points."
      stats={stats}
      loading={loading}
      error={error}
    >
      <>
      {!isAdmin ? (
        <p className="mb-3 rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-700">
          You can view inventory, but only admins can edit stock or delete products.
        </p>
      ) : null}

      <div className="mb-4">
        <input
          type="search"
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
          placeholder="Search product, barcode, stock, status..."
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground sm:max-w-sm"
        />
      </div>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Inventory Stock</DialogTitle>
            <DialogDescription>Update stock for {activeProduct?.name || "selected product"}.</DialogDescription>
          </DialogHeader>

          <form onSubmit={handleUpdateStock} className="space-y-3">
            <label className="block text-xs text-muted-foreground">
              Stock
              <input
                name="stock"
                type="number"
                min="0"
                step="1"
                value={editStock}
                onChange={(event) => setEditStock(event.target.value)}
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

      <Dialog
        open={deleteOpen}
        onOpenChange={(open) => {
          setDeleteOpen(open);
          if (!open) {
            setDeleteError("");
          }
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Delete Product</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete {activeProduct?.name || "this product"} from inventory?
            </DialogDescription>
          </DialogHeader>
          {deleteError ? <p className="text-sm text-destructive">{deleteError}</p> : null}
          <DialogFooter>
            <button
              type="button"
              onClick={() => {
                setDeleteOpen(false);
                setDeleteError("");
              }}
              className="rounded-md border border-input px-4 py-2 text-sm font-medium text-foreground hover:bg-muted"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={confirmDeleteInventoryProduct}
              disabled={deleting}
              className="rounded-md bg-destructive px-4 py-2 text-sm font-medium text-destructive-foreground disabled:opacity-60"
            >
              {deleting ? "Deleting..." : "Delete"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div
        className="relative overflow-x-auto rounded-lg border border-border/60"
        onWheelCapture={handleInventoryWheel}
        onWheel={handleInventoryWheel}
      >
        <table className="w-full min-w-full text-sm">
          <thead className="bg-muted/30 text-left">
            <tr>
              <th onContextMenu={(event) => openColumnContextMenu(event, "product")} className={`px-3 py-2 ${getColumnToneClassName("product")}`} style={getColumnToneStyle("product")}>Product</th>
              <th onContextMenu={(event) => openColumnContextMenu(event, "stock")} className={`px-3 py-2 ${getColumnToneClassName("stock")}`} style={getColumnToneStyle("stock")}>Stock</th>
              <th onContextMenu={(event) => openColumnContextMenu(event, "status")} className={`px-3 py-2 ${getColumnToneClassName("status")}`} style={getColumnToneStyle("status")}>Status</th>
              <th onContextMenu={(event) => openColumnContextMenu(event, "cost")} className={`px-3 py-2 ${getColumnToneClassName("cost")}`} style={getColumnToneStyle("cost")}>Cost Value</th>
              <th onContextMenu={(event) => openColumnContextMenu(event, "action")} className={`px-3 py-2 ${getColumnToneClassName("action")}`} style={getColumnToneStyle("action")}>Action</th>
            </tr>
          </thead>
          <tbody>
            {filteredProducts.map((product) => {
              const stock = Number(product.stock || 0);
              const outOfStock = stock <= 0;
              const low = stock > 0 && stock < 10;
              const selected = product.id === selectedProductId;
              const rowTone = outOfStock
                ? "bg-rose-500/10 hover:bg-rose-500/15"
                : low
                  ? "bg-amber-400/14 hover:bg-amber-400/20"
                  : "bg-emerald-500/8 hover:bg-emerald-500/12";
              const selectedTone = selected ? "outline outline-2 outline-primary/60 outline-offset-[-2px]" : "";
              return (
                <tr
                  key={product.id}
                  onClick={() => setSelectedProductId(product.id)}
                  className={`border-t border-border/50 transition-colors ${rowTone} ${selectedTone}`}
                >
                  <td className={`px-3 py-2 ${getColumnToneClassName("product")}`} style={getColumnToneStyle("product")}>{product.name}</td>
                  <td className={`px-3 py-2 font-medium ${outOfStock ? "text-rose-700" : low ? "text-amber-700" : "text-emerald-700"} ${getColumnToneClassName("stock")}`} style={getColumnToneStyle("stock")}>{stock}</td>
                  <td className={`px-3 py-2 ${getColumnToneClassName("status")}`} style={getColumnToneStyle("status")}>
                    <span className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-medium ${
                      outOfStock
                        ? "border-rose-500/25 bg-rose-500/10 text-rose-700"
                        : low
                          ? "border-amber-500/30 bg-amber-500/12 text-amber-700"
                          : "border-emerald-500/25 bg-emerald-500/10 text-emerald-700"
                    }`}>
                      {outOfStock ? "Out of Stock" : low ? "Low Stock" : "Healthy"}
                    </span>
                  </td>
                  <td className={`px-3 py-2 ${getColumnToneClassName("cost")}`} style={getColumnToneStyle("cost")}>{formatCurrency(stock * Number(product.cost_price || 0))}</td>
                  <td className={`px-3 py-2 ${getColumnToneClassName("action")}`} style={getColumnToneStyle("action")}>
                    {isAdmin ? (
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleEditInventoryProduct(product)}
                          className="rounded-md border border-input px-2.5 py-1 text-xs font-medium hover:bg-muted"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteInventoryProduct(product)}
                          className="rounded-md border border-destructive/50 px-2.5 py-1 text-xs font-medium text-destructive hover:bg-destructive/10"
                        >
                          Delete
                        </button>
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">Admin only</span>
                    )}
                  </td>
                </tr>
              );
            })}
            {!loading && filteredProducts.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-3 py-6 text-center text-sm text-muted-foreground">
                  No inventory items found.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>

      </div>

      {colorMenu ? (
        <div
          className="fixed z-50 min-w-56 rounded-xl border border-border bg-background p-3 shadow-xl"
          style={{ left: colorMenu.x, top: colorMenu.y }}
          onClick={(event) => event.stopPropagation()}
        >
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Colorize {columnOptions.find((option) => option.key === colorMenu.columnKey)?.label || "Column"}
          </p>

          <div className="grid grid-cols-2 gap-2">
            {columnColorChoices.map((option) => (
              <button
                key={option.key}
                type="button"
                onClick={() => setColumnColor(colorMenu.columnKey, option.key)}
                className="rounded-md border border-input px-3 py-2 text-sm font-medium hover:bg-muted"
              >
                {option.label}
              </button>
            ))}
          </div>

          <label className="mt-3 block text-sm font-medium text-foreground">
            Custom Color
            <input
              type="color"
              value={
                isCustomHexColor(columnColors[colorMenu.columnKey])
                  ? columnColors[colorMenu.columnKey]
                  : "#d9f99d"
              }
              onChange={(event) => setColumnColor(colorMenu.columnKey, event.target.value)}
              className="mt-2 block h-11 w-full cursor-pointer rounded-md border border-input bg-background"
            />
          </label>

          <div className="mt-3 flex justify-end">
            <button
              type="button"
              onClick={() => setColorMenu(null)}
              className="rounded-md border border-input px-4 py-2 text-sm font-medium text-foreground hover:bg-muted"
            >
              Close
            </button>
          </div>
        </div>
      ) : null}
      </>
    </SectionPage>
  );
}

export default Inventory;

