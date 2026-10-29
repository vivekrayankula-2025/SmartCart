import { useState } from "react";

import ProductImage from "./ProductImage";
import { createSellerProduct, errorMessage, updateSellerProduct } from "../services/api";

const EMPTY = {
  name: "",
  category: "",
  brand: "",
  price: "",
  original_price: "",
  stock: "",
  image_url: "",
  description: "",
  is_active: true,
};

/** Create or edit one of the signed-in seller's products. */
export default function ProductForm({ product, categories, onSaved, onCancel }) {
  const [form, setForm] = useState(
    product
      ? { ...EMPTY, ...product, category: categories.find((c) => c.name === product.category)?.slug ?? product.category }
      : { ...EMPTY, category: categories[0]?.slug ?? "" },
  );
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const setField = (field) => (event) =>
    setForm({ ...form, [field]: event.target.type === "checkbox" ? event.target.checked : event.target.value });

  const handleSubmit = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    const payload = {
      name: form.name,
      category: form.category,
      brand: form.brand,
      price: form.price,
      original_price: form.original_price || form.price,
      stock: form.stock === "" ? 0 : Number(form.stock),
      image_url: form.image_url,
      description: form.description,
      is_active: form.is_active,
    };
    try {
      const saved = product
        ? await updateSellerProduct(product.id, payload)
        : await createSellerProduct(payload);
      onSaved(saved);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="panel product-form" onSubmit={handleSubmit}>
      <h2>{product ? "Edit product" : "Add a product"}</h2>

      <div className="two">
        <label>
          Product name
          <input required value={form.name} onChange={setField("name")} placeholder="e.g. Acme Soundbar" />
        </label>
        <label>
          Brand
          <input required value={form.brand} onChange={setField("brand")} placeholder="e.g. Acme" />
        </label>
      </div>

      <div className="two">
        <label>
          Category
          <select required value={form.category} onChange={setField("category")}>
            {categories.map((category) => (
              <option key={category.id} value={category.slug}>
                {category.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Stock
          <input required type="number" min="0" value={form.stock} onChange={setField("stock")} />
        </label>
      </div>

      <div className="two">
        <label>
          Price (₹)
          <input required type="number" min="0" step="0.01" value={form.price} onChange={setField("price")} />
        </label>
        <label>
          Original price (₹)
          <input
            type="number"
            min="0"
            step="0.01"
            value={form.original_price}
            onChange={setField("original_price")}
            placeholder="Same as price if empty"
          />
        </label>
      </div>

      <label>
        Product picture URL
        <input type="url" value={form.image_url} onChange={setField("image_url")} placeholder="https://…" />
        <small className="photo-hint">Add a public product image URL. Leave blank to use the matching category photograph.</small>
      </label>

      <div className="photo-preview">
        <ProductImage product={{ name: form.name || "Product preview", category_slug: form.category, image_url: form.image_url }} alt="Product image preview" />
        <span>Storefront picture preview</span>
      </div>

      <label>
        Description
        <textarea rows="4" value={form.description} onChange={setField("description")} />
      </label>

      <label className="check">
        <input type="checkbox" checked={form.is_active} onChange={setField("is_active")} />
        Visible in the store
      </label>

      {error && <div className="form-error">{error}</div>}

      <div className="row-actions">
        <button className="btn btn-primary" disabled={busy}>
          {busy ? "Saving…" : product ? "Save changes" : "Add product"}
        </button>
        <button type="button" className="btn btn-ghost" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </form>
  );
}
