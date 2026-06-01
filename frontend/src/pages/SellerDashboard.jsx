import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { Plus, Pencil, Trash2, X, PackageOpen } from "lucide-react";
import api from "../utils/api";

const EMPTY = { name: "", description: "", price: "", category: "", stock: "" };

const SellerDashboard = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [imageFile, setImageFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      const { data } = await api.get("/products/v1/mine");
      setProducts(data.data ?? []);
    } catch (err) {
      setError(err.response?.data?.message ?? "Failed to load products");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => { setEditingId(null); setForm(EMPTY); setImageFile(null); setError(""); setShowForm(true); };
  const openEdit = (p) => {
    setEditingId(p._id);
    setForm({ name: p.name, description: p.description, price: p.price, category: p.category, stock: p.stock });
    setImageFile(null);
    setError("");
    setShowForm(true);
  };

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => fd.append(k, v));
      if (imageFile) fd.append("image", imageFile);
      // Let the browser set the multipart boundary (override the JSON default).
      const cfg = { headers: { "Content-Type": "multipart/form-data" } };
      if (editingId) await api.put(`/products/v1/${editingId}`, fd, cfg);
      else await api.post("/products/v1", fd, cfg);
      setShowForm(false);
      setForm(EMPTY);
      setImageFile(null);
      await load();
    } catch (err) {
      setError(err.response?.data?.message ?? "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id) => {
    if (!confirm("Delete this product?")) return;
    try {
      await api.delete(`/products/v1/${id}`);
      setProducts((prev) => prev.filter((p) => p._id !== id));
    } catch (err) {
      alert(err.response?.data?.message ?? "Delete failed");
    }
  };

  return (
    <div className="max-w-5xl mx-auto py-12 px-4 space-y-8">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-black uppercase tracking-tighter">My Products</h1>
          <p className="text-gray-500 text-sm mt-1">{products.length} listed</p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 bg-black text-white px-4 py-2.5 rounded-2xl text-sm font-bold hover:bg-black/90 transition-all"
        >
          <Plus size={16} /> Add Product
        </button>
      </div>

      {error && !showForm && <p className="text-red-500 text-sm font-medium">{error}</p>}

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => <div key={i} className="h-28 bg-gray-100 rounded-2xl animate-pulse" />)}
        </div>
      ) : products.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-gray-400 gap-3">
          <PackageOpen size={48} strokeWidth={1.5} />
          <p className="font-bold uppercase tracking-widest text-sm">No products yet</p>
          <p className="text-sm">Click “Add Product” to list your first item.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {products.map((p) => (
            <motion.div key={p._id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
              className="bg-white border border-gray-100 rounded-2xl overflow-hidden">
              <div className="aspect-[4/3] bg-gray-100 overflow-hidden">
                <img src={p.image} alt={p.name} className="w-full h-full object-cover" />
              </div>
              <div className="p-4 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-bold text-sm line-clamp-1">{p.name}</h3>
                  {p.isFlagged && <span className="text-[9px] font-black uppercase text-red-600 bg-red-50 px-1.5 py-0.5 rounded-full shrink-0">Flagged</span>}
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-black">₹{p.price}</span>
                  <span className="text-xs text-gray-400">Stock: {p.stock}</span>
                </div>
                <div className="flex gap-2 pt-1">
                  <button onClick={() => openEdit(p)} className="flex-1 flex items-center justify-center gap-1 text-xs font-bold border border-gray-200 rounded-xl py-2 hover:bg-gray-50 transition-colors">
                    <Pencil size={13} /> Edit
                  </button>
                  <button onClick={() => remove(p._id)} className="flex items-center justify-center text-red-400 hover:bg-red-50 hover:text-red-600 border border-gray-200 rounded-xl px-3 transition-colors">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Create / edit form */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => setShowForm(false)}>
          <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-3xl w-full max-w-lg p-6 space-y-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-black uppercase tracking-tight">{editingId ? "Edit product" : "New product"}</h2>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-black"><X size={20} /></button>
            </div>

            {error && <p className="text-red-500 text-sm font-medium">{error}</p>}

            <form onSubmit={submit} className="space-y-3">
              <input required placeholder="Product name" value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full bg-gray-100 rounded-2xl py-3 px-4 text-sm outline-none focus:ring-2 focus:ring-black" />
              <textarea required placeholder="Description" rows={3} value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="w-full bg-gray-100 rounded-2xl py-3 px-4 text-sm outline-none focus:ring-2 focus:ring-black" />
              <div className="grid grid-cols-2 gap-3">
                <input required type="number" min="0" step="0.01" placeholder="Price (₹)" value={form.price}
                  onChange={(e) => setForm({ ...form, price: e.target.value })}
                  className="bg-gray-100 rounded-2xl py-3 px-4 text-sm outline-none focus:ring-2 focus:ring-black" />
                <input type="number" min="0" placeholder="Stock" value={form.stock}
                  onChange={(e) => setForm({ ...form, stock: e.target.value })}
                  className="bg-gray-100 rounded-2xl py-3 px-4 text-sm outline-none focus:ring-2 focus:ring-black" />
              </div>
              <input required placeholder="Category" value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                className="w-full bg-gray-100 rounded-2xl py-3 px-4 text-sm outline-none focus:ring-2 focus:ring-black" />
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Image {editingId && "(leave empty to keep current)"}</label>
                <input type="file" accept="image/*" onChange={(e) => setImageFile(e.target.files?.[0] ?? null)}
                  className="w-full text-sm mt-1 file:mr-3 file:py-2 file:px-4 file:rounded-full file:border-0 file:bg-black file:text-white file:text-xs file:font-bold" />
              </div>
              <button type="submit" disabled={saving}
                className="w-full bg-black text-white py-3 rounded-full font-bold text-sm uppercase tracking-widest hover:bg-black/90 transition-all disabled:opacity-50">
                {saving ? "Saving…" : editingId ? "Save changes" : "Create product"}
              </button>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default SellerDashboard;
