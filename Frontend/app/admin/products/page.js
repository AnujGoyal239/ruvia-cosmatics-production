"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { toast } from "sonner";
import { apiUrl } from "../../../constants";
import { Button } from "../../../components/ui/Button";
import ProductImage from "../../../components/ui/ProductImage";
import { Plus, Edit, Trash2, Search, X, Star } from "lucide-react";

// Hard cap matches backend MAX_PRODUCT_IMAGES (see backend/models/productModel.js).
// Keep these in sync if you ever raise the limit on the server.
const MAX_PRODUCT_IMAGES = 5;
const ACCEPTED_IMAGE_TYPES = "image/jpeg,image/png,image/webp";

// One entry in the gallery editor. `kind: "kept"` is an existing Cloudinary
// URL the admin wants to retain; `kind: "new"` is a freshly-selected File
// waiting to upload on submit.
const buildKept = (url) => ({ kind: "kept", url, key: `kept:${url}` });
const buildNew = (file) => ({
  kind: "new",
  file,
  // Preview URLs are object URLs on the user's machine. We revoke them on
  // unmount to avoid leaking memory.
  previewUrl: URL.createObjectURL(file),
  key: `new:${file.name}:${file.lastModified}:${file.size}`,
});

const blankFormData = {
  name: "",
  price: "",
  category: "",
  description: "",
  countInStock: "",
  originalPrice: "",
  tag: "",
  concern: "",
  ingredients: "",
  usage: "",
  benefits: "",
};

export default function AdminProductsPage() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [formData, setFormData] = useState(blankFormData);

  // Gallery editor state. Order in the array drives display order; index 0
  // is the primary image surfaced everywhere on the storefront.
  const [galleryItems, setGalleryItems] = useState([]);

  const resetGallery = useCallback(() => {
    setGalleryItems((prev) => {
      // Revoke preview object URLs we no longer need.
      for (const item of prev) {
        if (item.kind === "new" && item.previewUrl) {
          URL.revokeObjectURL(item.previewUrl);
        }
      }
      return [];
    });
  }, []);

  useEffect(() => {
    return () => {
      // Cleanup any object URLs when the page unmounts.
      for (const item of galleryItems) {
        if (item.kind === "new" && item.previewUrl) {
          URL.revokeObjectURL(item.previewUrl);
        }
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchProducts = useCallback(async () => {
    try {
      const response = await fetch(apiUrl("/api/products"), { credentials: "include" });

      if (response.ok) {
        const data = await response.json();
        const items = Array.isArray(data)
          ? data
          : Array.isArray(data?.data)
          ? data.data
          : [];
        setProducts(items);
      }
    } catch (error) {
      console.error("Failed to fetch products:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const remainingSlots = useMemo(
    () => Math.max(0, MAX_PRODUCT_IMAGES - galleryItems.length),
    [galleryItems.length]
  );

  const addFiles = (fileList) => {
    if (!fileList || fileList.length === 0) return;
    const incoming = Array.from(fileList);
    if (incoming.length > remainingSlots) {
      toast.error(
        `You can have at most ${MAX_PRODUCT_IMAGES} images per product.`
      );
    }
    const acceptable = [];
    for (const file of incoming.slice(0, remainingSlots)) {
      if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
        toast.error(`${file.name}: only JPEG, PNG, and WebP images are allowed.`);
        continue;
      }
      if (file.size > 5 * 1024 * 1024) {
        toast.error(`${file.name}: file is larger than 5 MB.`);
        continue;
      }
      acceptable.push(buildNew(file));
    }
    if (acceptable.length === 0) return;
    setGalleryItems((prev) => [...prev, ...acceptable]);
  };

  const removeGalleryItem = (key) => {
    setGalleryItems((prev) => {
      const next = [];
      for (const item of prev) {
        if (item.key === key) {
          if (item.kind === "new" && item.previewUrl) {
            URL.revokeObjectURL(item.previewUrl);
          }
          continue;
        }
        next.push(item);
      }
      return next;
    });
  };

  const moveItemToFront = (key) => {
    setGalleryItems((prev) => {
      const idx = prev.findIndex((i) => i.key === key);
      if (idx <= 0) return prev;
      const copy = [...prev];
      const [picked] = copy.splice(idx, 1);
      copy.unshift(picked);
      return copy;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;

    if (galleryItems.length === 0) {
      toast.error("Please add at least one image.");
      return;
    }

    const fd = new FormData();
    Object.keys(formData).forEach((key) => {
      // Skip empty optional fields so PUT updates don't overwrite existing
      // values with blanks. Required fields (name/category/etc.) are still
      // sent because the form field's value is non-empty.
      if (formData[key] !== undefined && formData[key] !== null && formData[key] !== "") {
        fd.append(key, formData[key]);
      }
    });

    // Tell the backend which existing Cloudinary URLs we're keeping. Order
    // matters — these come first in the resulting `images` array.
    const keep = galleryItems.filter((i) => i.kind === "kept").map((i) => i.url);
    fd.append("keepImages", JSON.stringify(keep));

    // Append every freshly-selected file under the `images` field. Order is
    // preserved by FormData append-order, which the controller respects.
    for (const item of galleryItems) {
      if (item.kind === "new") fd.append("images", item.file, item.file.name);
    }

    // Pick the primary image. `galleryItems[0]` is the convention. For
    // existing URLs we send the URL string directly so the backend can
    // resolve it without re-uploading.
    const first = galleryItems[0];
    if (first.kind === "kept") {
      fd.append("primaryImage", first.url);
    }
    // For "new" first items, the backend defaults to images[0] of the final
    // array (kept + uploaded), which equals the first uploaded URL — exactly
    // what we want.

    const url = editingProduct
      ? apiUrl(`/api/products/${editingProduct._id}`)
      : apiUrl("/api/products");
    const method = editingProduct ? "PUT" : "POST";

    try {
      setSubmitting(true);
      const response = await fetch(url, {
        method,
        credentials: "include",
        body: fd,
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data?.message || "Failed to save product");
      }

      setShowModal(false);
      setEditingProduct(null);
      setFormData(blankFormData);
      resetGallery();
      fetchProducts();
      toast.success("Product saved successfully");
    } catch (error) {
      console.error("Failed to save product:", error);
      toast.error(error.message || "Failed to save product");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (productId) => {
    if (!confirm("Are you sure you want to delete this product?")) return;

    try {
      const response = await fetch(apiUrl(`/api/products/${productId}`), {
        method: "DELETE",
        credentials: "include",
      });

      if (response.ok) {
        fetchProducts();
        toast.success("Product deleted successfully");
      } else {
        toast.error("Failed to delete product");
      }
    } catch (error) {
      console.error("Failed to delete product:", error);
      toast.error("Failed to delete product");
    }
  };

  const openCreate = () => {
    setEditingProduct(null);
    setFormData(blankFormData);
    resetGallery();
    setShowModal(true);
  };

  const openEdit = (product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name || "",
      price: product.price || "",
      category: product.category || "",
      description: product.description || "",
      countInStock: product.countInStock ?? "",
      originalPrice: product.originalPrice ?? "",
      tag: product.tag || "",
      concern: product.concern || "",
      ingredients: Array.isArray(product.ingredients)
        ? product.ingredients.join(", ")
        : product.ingredients || "",
      usage: product.usage || "",
      benefits: Array.isArray(product.benefits)
        ? product.benefits.join(", ")
        : product.benefits || "",
    });

    // Seed the gallery editor from the product's existing images, with the
    // primary image first if present.
    const all = Array.isArray(product.images) && product.images.length > 0
      ? product.images.slice()
      : product.image
      ? [product.image]
      : [];
    if (product.image && all.includes(product.image)) {
      const others = all.filter((u) => u !== product.image);
      setGalleryItems([buildKept(product.image), ...others.map(buildKept)]);
    } else {
      setGalleryItems(all.map(buildKept));
    }

    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    resetGallery();
  };

  const filteredProducts = products.filter(
    (product) =>
      product.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.category?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-brand-dark">Loading products...</div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="font-serif text-3xl font-bold text-brand-dark mb-2">Products</h1>
          <p className="text-brand-dark/60">Manage your product inventory</p>
        </div>
        <Button variant="primary" className="rounded-md" onClick={openCreate}>
          <Plus size={20} className="mr-2" />
          Add Product
        </Button>
      </div>

      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-brand-dark/40" size={20} />
          <input
            type="text"
            placeholder="Search products..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border border-brand-dark/10 rounded-md focus:border-brand-pink focus:ring-1 focus:ring-brand-pink outline-none"
          />
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-brand-dark/10 overflow-hidden">
        <table className="w-full">
          <thead className="bg-brand-dark/5">
            <tr>
              <th className="text-left p-4 font-medium text-brand-dark">Product</th>
              <th className="text-left p-4 font-medium text-brand-dark">Category</th>
              <th className="text-left p-4 font-medium text-brand-dark">Price</th>
              <th className="text-left p-4 font-medium text-brand-dark">Stock</th>
              <th className="text-left p-4 font-medium text-brand-dark">Images</th>
              <th className="text-left p-4 font-medium text-brand-dark">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredProducts.map((product) => (
              <tr key={product._id} className="border-t border-brand-dark/10">
                <td className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-brand-dark/5 rounded-md overflow-hidden">
                      <ProductImage
                        src={product.image}
                        alt={product.name}
                        className="w-full h-full object-cover"
                        iconSize={20}
                      />
                    </div>
                    <div>
                      <p className="font-medium text-brand-dark">{product.name}</p>
                      <p className="text-sm text-brand-dark/60">{product.tag}</p>
                    </div>
                  </div>
                </td>
                <td className="p-4 text-brand-dark/60">{product.category}</td>
                <td className="p-4 font-medium text-brand-dark">₹{product.price}</td>
                <td className="p-4 text-brand-dark/60">{product.countInStock}</td>
                <td className="p-4 text-brand-dark/60">
                  {Array.isArray(product.images) ? product.images.length : product.image ? 1 : 0}
                </td>
                <td className="p-4">
                  <div className="flex gap-2">
                    <button
                      onClick={() => openEdit(product)}
                      className="p-2 text-brand-pink hover:bg-brand-pink/10 rounded-md transition-colors"
                    >
                      <Edit size={18} />
                    </button>
                    <button
                      onClick={() => handleDelete(product._id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-md transition-colors"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto p-6 relative">
            <button
              onClick={closeModal}
              className="absolute top-4 right-4 w-9 h-9 rounded-full border border-brand-dark/10 flex items-center justify-center text-brand-dark hover:bg-brand-dark/5 transition-all"
              aria-label="Close"
            >
              <X size={16} />
            </button>

            <h2 className="font-serif text-2xl font-bold text-brand-dark mb-6">
              {editingProduct ? "Edit Product" : "Add Product"}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-brand-dark mb-2">Name *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-3 border border-brand-dark/10 rounded-md focus:border-brand-pink focus:ring-1 focus:ring-brand-pink outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-brand-dark mb-2">Category *</label>
                  <input
                    type="text"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-4 py-3 border border-brand-dark/10 rounded-md focus:border-brand-pink focus:ring-1 focus:ring-brand-pink outline-none"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-brand-dark mb-2">Price *</label>
                  <input
                    type="number"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    className="w-full px-4 py-3 border border-brand-dark/10 rounded-md focus:border-brand-pink focus:ring-1 focus:ring-brand-pink outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-brand-dark mb-2">Stock *</label>
                  <input
                    type="number"
                    value={formData.countInStock}
                    onChange={(e) => setFormData({ ...formData, countInStock: e.target.value })}
                    className="w-full px-4 py-3 border border-brand-dark/10 rounded-md focus:border-brand-pink focus:ring-1 focus:ring-brand-pink outline-none"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-brand-dark mb-2">Description *</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-4 py-3 border border-brand-dark/10 rounded-md focus:border-brand-pink focus:ring-1 focus:ring-brand-pink outline-none h-24"
                  required
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-brand-dark">
                    Images (max {MAX_PRODUCT_IMAGES})
                  </label>
                  <span className="text-xs text-brand-dark/50">
                    {galleryItems.length}/{MAX_PRODUCT_IMAGES} • first image is primary
                  </span>
                </div>

                {galleryItems.length > 0 && (
                  <div className="grid grid-cols-3 sm:grid-cols-5 gap-3 mb-3">
                    {galleryItems.map((item, idx) => {
                      const src = item.kind === "kept" ? item.url : item.previewUrl;
                      const isPrimary = idx === 0;
                      return (
                        <div
                          key={item.key}
                          className={`relative aspect-square rounded-md overflow-hidden border ${
                            isPrimary
                              ? "border-brand-pink ring-2 ring-brand-pink/30"
                              : "border-brand-dark/10"
                          }`}
                        >
                          <ProductImage
                            src={src}
                            alt={`product image ${idx + 1}`}
                            className="w-full h-full object-cover"
                            iconSize={20}
                          />
                          {isPrimary ? (
                            <span className="absolute top-1 left-1 inline-flex items-center gap-1 bg-brand-pink text-white text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded">
                              <Star size={10} fill="currentColor" /> Primary
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => moveItemToFront(item.key)}
                              className="absolute top-1 left-1 bg-white/90 text-brand-dark text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded hover:bg-brand-pink hover:text-white transition-colors"
                              title="Set as primary"
                            >
                              Set primary
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => removeGalleryItem(item.key)}
                            className="absolute top-1 right-1 w-6 h-6 rounded-full bg-white/90 text-brand-dark hover:bg-red-500 hover:text-white transition-colors flex items-center justify-center"
                            title="Remove"
                          >
                            <X size={12} />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}

                <input
                  type="file"
                  accept={ACCEPTED_IMAGE_TYPES}
                  multiple
                  onChange={(e) => {
                    addFiles(e.target.files);
                    // Reset the input so re-selecting the same files re-fires
                    // the change handler.
                    e.target.value = "";
                  }}
                  disabled={remainingSlots === 0}
                  className="w-full px-4 py-3 border border-brand-dark/10 rounded-md focus:border-brand-pink focus:ring-1 focus:ring-brand-pink outline-none disabled:opacity-50"
                />
                <p className="text-xs text-brand-dark/50 mt-1">
                  JPEG, PNG, or WebP. Up to 5 MB each. The first image is shown
                  as the cover everywhere on the storefront.
                </p>
              </div>

              <div className="flex gap-4 justify-end pt-2">
                <Button
                  type="button"
                  variant="secondary"
                  className="rounded-md"
                  onClick={closeModal}
                  disabled={submitting}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  className="rounded-md"
                  disabled={submitting}
                >
                  {submitting
                    ? editingProduct
                      ? "Updating..."
                      : "Creating..."
                    : editingProduct
                    ? "Update"
                    : "Create"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
