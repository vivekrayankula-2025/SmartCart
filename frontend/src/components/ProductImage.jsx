import { useEffect, useMemo, useState } from "react";

const MANAGED_PHOTOS = {
  audio: "/manus-storage/async-images/8ckabZATiz0RDt0enwupxA/image-1.webp",
  laptops: "/manus-storage/async-images/8ckabZATiz0RDt0enwupxA/image-2.webp",
  mobiles: "/manus-storage/async-images/8ckabZATiz0RDt0enwupxA/image-3.webp",
  cameras: "/manus-storage/async-images/8ckabZATiz0RDt0enwupxA/image-4.webp",
  gaming: "/manus-storage/async-images/8ckabZATiz0RDt0enwupxA/image-5.webp",
  fashion: "/manus-storage/async-images/WcS6d33wk6hi6vreQPRNDb/image-1.webp",
  home: "/manus-storage/async-images/WcS6d33wk6hi6vreQPRNDb/image-2.webp",
  accessories: "/manus-storage/async-images/WcS6d33wk6hi6vreQPRNDb/image-3.webp",
};

const normalizeCategory = (value = "") =>
  value.toLowerCase().replaceAll(" ", "-").replaceAll("&", "and");

function getCandidates(product) {
  const category = normalizeCategory(product.category_slug || product.category || "accessories");
  const managed = MANAGED_PHOTOS[category];
  const base = import.meta.env.BASE_URL || "/";
  const local = `${base.replace(/\/$/, "")}/images/${category}.webp`;
  const supplied = product.image_url || "";
  const isPlaceholder = /placehold\.co|\/api\/placeholder\//i.test(supplied);
  const isCategoryPath = /^\/?images\//.test(supplied);
  const candidates = [];

  // Seller-provided pictures take priority; seeded products use the generated photo first.
  if (supplied && !isPlaceholder && !isCategoryPath) candidates.push(supplied);
  if (managed) candidates.push(managed);
  if (supplied && !isPlaceholder) candidates.push(supplied);
  candidates.push(local);
  return [...new Set(candidates)];
}

export default function ProductImage({ product, alt, ...props }) {
  const candidates = useMemo(() => getCandidates(product || {}), [product]);
  const [index, setIndex] = useState(0);
  useEffect(() => setIndex(0), [candidates]);

  const source = candidates[index];
  return (
    <img
      {...props}
      src={source}
      alt={alt ?? product?.name ?? "Product"}
      onError={(event) => {
        props.onError?.(event);
        setIndex((current) => Math.min(current + 1, candidates.length - 1));
      }}
    />
  );
}
