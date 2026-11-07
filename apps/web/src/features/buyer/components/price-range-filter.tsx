"use client";

import { useState } from "react";

export function PriceRangeFilter({ maximum, initialMin, initialMax }: { maximum: number; initialMin?: string; initialMax?: string }) {
  const ceiling = Math.max(100, Math.ceil(maximum / 100) * 100);
  const [min, setMin] = useState(Math.max(0, Math.min(Number(initialMin) || 0, ceiling)));
  const [max, setMax] = useState(Math.max(min, Math.min(Number(initialMax) || ceiling, ceiling)));
  const left = min / ceiling * 100;
  const right = max / ceiling * 100;
  return <div className="ggh-price-slider">
    <div className="ggh-price-slider-values"><label>Min ₹<input aria-label="Minimum price in rupees" type="number" min="0" max={max} step="10" value={min} onChange={event => setMin(Math.max(0, Math.min(Number(event.target.value) || 0, max)))} /></label><label>Max ₹<input aria-label="Maximum price in rupees" type="number" min={min} max={ceiling} step="10" value={max} onChange={event => setMax(Math.max(min, Math.min(Number(event.target.value) || 0, ceiling)))} /></label></div>
    <div className="ggh-price-slider-track" style={{ background: `linear-gradient(to right,#e6d7d0 ${left}%,#c84332 ${left}%,#c84332 ${right}%,#e6d7d0 ${right}%)` }}>
      <input aria-label="Minimum price" type="range" min="0" max={ceiling} step="10" value={min} onChange={event => setMin(Math.min(Number(event.target.value), max))} />
      <input aria-label="Maximum price" type="range" min="0" max={ceiling} step="10" value={max} onChange={event => setMax(Math.max(Number(event.target.value), min))} />
    </div>
    <input type="hidden" name="minPrice" value={min || ""} />
    <input type="hidden" name="maxPrice" value={max >= ceiling ? "" : max} />
  </div>;
}
