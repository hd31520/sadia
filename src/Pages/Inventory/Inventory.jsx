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

function Inventory() {
  const currentUser = getStoredUser();
  const isAdmin = currentUser?.role === "admin";
  const [products, setProducts] = useState([]);
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

  const lowStockItems = useMemo(
    () => products.filter((product) => Number(product.stock || 0) < 10),
    [products]
  );

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

      <div className="overflow-x-auto rounded-lg border border-border/60">
        <table className="w-full min-w-full text-sm">
          <thead className="bg-muted/30 text-left">
            <tr>
              <th className="px-3 py-2">Product</th>
              <th className="px-3 py-2">Stock</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Cost Value</th>
              <th className="px-3 py-2">Action</th>
            </tr>
          </thead>
          <tbody>
            {products.map((product) => {
              const stock = Number(product.stock || 0);
              const low = stock < 10;
              return (
                <tr key={product.id} className="border-t border-border/50">
                  <td className="px-3 py-2">{product.name}</td>
                  <td className="px-3 py-2">{stock}</td>
                  <td className="px-3 py-2">{low ? "Low" : "Healthy"}</td>
                  <td className="px-3 py-2">{formatCurrency(stock * Number(product.cost_price || 0))}</td>
                  <td className="px-3 py-2">
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
          </tbody>
        </table>
      </div>
      </>
    </SectionPage>
  );
}

export default Inventory;

