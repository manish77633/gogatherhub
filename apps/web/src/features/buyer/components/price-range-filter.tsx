"use client";

import { useState } from "react";

export function PriceRangeFilter({ maximum, initialMin, initialMax }: { maximum: number; initialMin?: string; initialMax?: string }) {
  const ceiling = Math.max(100, Math.ceil(maximum / 100) * 100);
  const [min, setMin] = useState(Math.max(0, Math.min(Number(initialMin) || 0, ceiling)));
  const [max, setMax] = useState(Math.max(min, Math.min(Number(initialMax) || ceiling, ceiling)));
  const left = min / ceiling * 100;
  const right = max / ceiling * 100;
  const money = (value: number) => `₹${value.toLocaleString("en-IN")}`;
  return <div className="ggh-price-slider">
    <div className="ggh-price-slider-values"><span>{money(min)}</span><span>{money(max)}</span></div>
    <div className="ggh-price-slider-track" style={{ background: `linear-gradient(to right,#e6d7d0 ${left}%,#c84332 ${left}%,#c84332 ${right}%,#e6d7d0 ${right}%)` }}>
      <input aria-label="Minimum price" type="range" min="0" max={ceiling} step="10" value={min} onChange={event => setMin(Math.min(Number(event.target.value), max))} />
      <input aria-label="Maximum price" type="range" min="0" max={ceiling} step="10" value={max} onChange={event => setMax(Math.max(Number(event.target.value), min))} />
    </div>
    <input type="hidden" name="minPrice" value={min || ""} />
    <input type="hidden" name="maxPrice" value={max >= ceiling ? "" : max} />
  </div>;
}
