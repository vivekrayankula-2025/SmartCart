import { SlidersHorizontal, Sparkles } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";

import ProductCard from "../components/ProductCard";
import { EmptyState, ErrorState, Loader } from "../components/StateMessage";
import { fetchCategories, fetchProducts } from "../services/api";
import { formatINR } from "../utils/format";

const MAX_PRICE = 100000;

const SORT_OPTIONS = [
  { value: "", label: "Featured" },
  { value: "-rating", label: "Top rated" },
  { value: "price", label: "Price: low to high" },
  { value: "-price", label: "Price: high to low" },
];

export default function Products() {
  const [params, setParams] = useSearchParams();
  const search = params.get("q") ?? "";
  const category = params.get("category") ?? "";
  const ordering = params.get("ordering") ?? "";
  const urlMaxPrice = Number(params.get("max_price")) || MAX_PRICE;

  const [categories, setCategories] = useState([]);
  const [items, setItems] = useState([]);
  const [count, setCount] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  // The slider keeps its own value while dragging and commits to the URL when idle.
  const [priceInput, setPriceInput] = useState(urlMaxPrice);

  const updateParam = (key, value) =>
    setParams(
      (current) => {
        const next = new URLSearchParams(current);
        if (value) next.set(key, value);
        else next.delete(key);
        return next;
      },
      { replace: true },
    );

  useEffect(() => {
    fetchCategories().then(setCategories).catch(() => {});
  }, []);

  useEffect(() => setPriceInput(urlMaxPrice), [urlMaxPrice]);

  useEffect(() => {
    if (priceInput === urlMaxPrice) return;
    const timer = setTimeout(
      () => updateParam("max_price", priceInput < MAX_PRICE ? String(priceInput) : ""),
      300,
    );
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [priceInput]);

  // Fetch whenever the filters or the page change. A filter change resets to page 1.
  const queryKey = params.toString();
  const previousKey = useRef(queryKey);

  useEffect(() => {
    if (previousKey.current !== queryKey) {
      previousKey.current = queryKey;
      if (page !== 1) {
        setPage(1);
        return;
      }
    }

    let cancelled = false;
    setLoading(true);
    setError(false);

    fetchProducts({
      search: search || undefined,
      category: category || undefined,
      ordering: ordering || undefined,
      max_price: urlMaxPrice < MAX_PRICE ? urlMaxPrice : undefined,
      page,
    })
      .then((data) => {
        if (cancelled) return;
        setCount(data.count);
        setItems((previous) => (page === 1 ? data.results : [...previous, ...data.results]));
      })
      .catch(() => !cancelled && setError(true))
      .finally(() => !cancelled && setLoading(false));

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryKey, page]);

  const hasMore = items.length < count;

  return (
    <section className="section">
      <div className="shop-head">
        <div>
          <span className="kicker">
            <Sparkles size={13} />
            Smart discovery
          </span>
          <h1>Explore the store</h1>
          <p>{search ? `Results for “${search}”` : "Discover products picked for modern everyday life."}</p>
        </div>
        <div className="result-count">{count} products</div>
      </div>

      <div className="shop-layout">
        <aside className="filters">
          <h3>
            <SlidersHorizontal size={16} />
            Filters
          </h3>

          <label>Category</label>
          <div className="chips">
            <button className={!category ? "active" : ""} onClick={() => updateParam("category", "")}>
              All
            </button>
            {categories.map((item) => (
              <button
                key={item.id}
                className={category === item.slug ? "active" : ""}
                onClick={() => updateParam("category", item.slug)}
              >
                {item.name}
              </button>
            ))}
          </div>

          <label>Maximum price</label>
          <input
            type="range"
            min="1000"
            max={MAX_PRICE}
            step="1000"
            value={priceInput}
            onChange={(event) => setPriceInput(Number(event.target.value))}
          />
          <div className="range-value">{formatINR(priceInput)}</div>

          <label>Sort by</label>
          <select value={ordering} onChange={(event) => updateParam("ordering", event.target.value)}>
            {SORT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </aside>

        <div>
          {error && <ErrorState />}

          {!error && items.length > 0 && (
            <div className="product-grid">
              {items.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}

          {!error && !loading && items.length === 0 && (
            <EmptyState
              icon="🔍"
              title="No products found"
              text="Try a different search or loosen your filters."
            />
          )}

          {loading && <Loader />}

          {!loading && hasMore && (
            <div className="load-more">
              <button className="btn btn-ghost" onClick={() => setPage((current) => current + 1)}>
                Load more
              </button>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
