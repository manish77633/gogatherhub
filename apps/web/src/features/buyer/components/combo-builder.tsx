"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { formatMoney } from "@/features/buyer/data/demo-data";
import {
  comboParts,
  type DemoCombo,
} from "@/features/buyer/data/store-catalog";
import { StoreIcon, useDemoCommerce } from "@/features/buyer/components/storefront";

export function ComboBuilder({ combo }: { combo: DemoCombo }) {
  const [selection, setSelection] = useState<Record<string, number>>(() =>
    Object.fromEntries(combo.parts.map((part) => [part.id, part.quantity])),
  );
  const [pin, setPin] = useState("");
  const [pinResult, setPinResult] = useState("");
  const [notice, setNotice] = useState("");
  const [activeImage, setActiveImage] = useState<string | null>(null);
  const [quantityDrafts, setQuantityDrafts] = useState<Record<string, string>>(
    {},
  );
  const { addKit } = useDemoCommerce();
  const selected = comboParts.filter((part) => (selection[part.id] ?? 0) > 0);
  const activePart = selected.find(part => part.id === activeImage);
  const total = selected.reduce(
    (sum, part) => sum + part.price * selection[part.id],
    0,
  );
  const count = selected.reduce((sum, part) => sum + selection[part.id], 0);
  const setQuantity = (id: string, quantity: number) => {
    setQuantityDrafts((current) => {
      const next = { ...current };
      delete next[id];
      return next;
    });
    setSelection((current) => ({
      ...current,
      [id]: Math.max(0, Math.min(10000, quantity)),
    }));
  };
  const commitQuantity = (id: string, raw: string) => {
    const parsed = Number(raw);
    if (
      raw.trim() &&
      Number.isInteger(parsed) &&
      parsed >= 1 &&
      parsed <= 10000
    )
      setQuantity(id, parsed);
    setQuantityDrafts((current) => {
      const next = { ...current };
      delete next[id];
      return next;
    });
  };
  return (
    <>
      <div className="ggh-combo-hero">
        <div className="ggh-combo-gallery">
        <div className="ggh-combo-hero-image">
          <Image
            src={activePart?.image ?? combo.image}
            alt={activePart?.name ?? combo.name}
            fill
            priority
            sizes="(max-width: 767px) 100vw, 50vw"
          />
        </div>
        <div className="ggh-combo-gallery-thumbs" aria-label="Kit product photos">
          <button type="button" className={!activePart ? "is-active" : ""} aria-label={`View ${combo.name} overview`} aria-pressed={!activePart} onClick={() => setActiveImage(null)}><Image src={combo.image} alt="" fill sizes="96px" /></button>
          {selected.map(part => <button type="button" key={part.id} className={activePart?.id === part.id ? "is-active" : ""} aria-label={`View ${part.name}`} aria-pressed={activePart?.id === part.id} onClick={() => setActiveImage(part.id)}><Image src={part.image} alt="" fill sizes="96px" /></button>)}
        </div>
        </div>
        <div className="ggh-combo-hero-copy">
          <p className="ggh-page-eyebrow">{combo.occasion} / Build your own</p>
          <h1>{combo.name}</h1>
          <p>{combo.description}</p>
          <div className="ggh-combo-pricing">
            <strong>{formatMoney(total)}</strong>
            <span>Demo price</span>
          </div>
          <div className="ggh-combo-overview" aria-live="polite">
            <h2>Included in your kit</h2>
            {selected.length ? <ul>{selected.map(part => <li key={part.id}><span>{part.name}</span><strong>× {selection[part.id]}</strong></li>)}</ul> : <p>No products selected yet. Add items below to build your kit.</p>}
            <a href="#customize-kit">Edit your selection ↓</a>
          </div>
          <p className="ggh-combo-note">
            Each item is priced individually. Quantities and total update as you
            edit this kit.
          </p>
          <form
            className="ggh-combo-pin"
            onSubmit={async (event) => {
              event.preventDefault();
              if (!/^\d{6}$/.test(pin)) { setPinResult("Enter a valid 6-digit Indian pincode."); return; }
              setPinResult("Checking availability…");
              try {
                const response = await fetch(`/api/catalog/delivery/${pin}`);
                if (!response.ok) throw new Error();
                const result = await response.json() as { available: boolean; cod: boolean };
                setPinResult(result.available ? `Delivery available${result.cod ? " · COD available" : ""}.` : "Delivery is not available for this pincode.");
              } catch { setPinResult("Availability service is unavailable right now."); }
            }}
          >
            <label htmlFor="combo-pin">Check delivery pincode</label>
            <div>
              <input
                id="combo-pin"
                inputMode="numeric"
                maxLength={6}
                value={pin}
                placeholder="Enter 6-digit pincode"
                onChange={(event) => {
                  setPin(event.target.value.replace(/\D/g, ""));
                  setPinResult("");
                }}
              />
              <button type="submit">Check</button>
            </div>
            <small role="status">
              {pinResult || "Enter your pincode to check delivery and COD availability."}
            </small>
          </form>
        </div>
      </div>
      <section className="ggh-combo-builder" id="customize-kit">
        <div className="ggh-page-section-head">
          <div>
            <p className="ggh-page-eyebrow">Your kit</p>
            <h2>Make it yours</h2>
            <p>Remove items, change quantities, or add extras below.</p>
          </div>
        </div>
        <div className="ggh-combo-layout">
          <div className="ggh-combo-list">
            {selected.length ? (
              selected.map((part) => (
                <article className="ggh-combo-line" key={part.id}>
                  <div className="ggh-combo-thumb">
                    <Image src={part.image} alt="" fill sizes="90px" />
                  </div>
                  <div>
                    <small>{part.category}</small>
                    <h3>{part.name}</h3>
                    <span>{formatMoney(part.price)} each</span>
                  </div>
                  <div className="ggh-combo-line-end">
                    <strong>
                      {formatMoney(part.price * selection[part.id])}
                    </strong>
                    <div className="ggh-quantity">
                      <button
                        type="button"
                        aria-label={`Decrease ${part.name}`}
                        onClick={() =>
                          setQuantity(part.id, selection[part.id] - 1)
                        }
                      >
                        −
                      </button>
                      <input
                        type="number"
                        min="1"
                        max="10000"
                        inputMode="numeric"
                        aria-label={`Quantity for ${part.name}`}
                        value={quantityDrafts[part.id] ?? selection[part.id]}
                        onChange={(event) =>
                          setQuantityDrafts((current) => ({
                            ...current,
                            [part.id]: event.target.value,
                          }))
                        }
                        onBlur={(event) =>
                          commitQuantity(part.id, event.target.value)
                        }
                        onKeyDown={(event) => {
                          if (event.key === "Enter") {
                            event.preventDefault();
                            event.currentTarget.blur();
                          }
                        }}
                      />
                      <button
                        type="button"
                        aria-label={`Increase ${part.name}`}
                        disabled={selection[part.id] >= 10000}
                        onClick={() =>
                          setQuantity(part.id, selection[part.id] + 1)
                        }
                      >
                        +
                      </button>
                    </div>
                    <label className="ggh-quick-quantity">
                      Quick set{" "}
                      <select
                        aria-label={`Quick quantity for ${part.name}`}
                        value=""
                        onChange={(event) =>
                          setQuantity(part.id, Number(event.target.value))
                        }
                      >
                        <option value="">Choose</option>
                        <option value="1">1</option>
                        <option value="10">10</option>
                        <option value="100">100</option>
                        <option value="1000">1,000</option>
                        <option value="2000">2,000</option>
                      </select>
                    </label>
                    <button
                      type="button"
                      className="ggh-text-button"
                      onClick={() => setQuantity(part.id, 0)}
                    >
                      Remove
                    </button>
                  </div>
                </article>
              ))
            ) : (
              <div className="ggh-combo-empty">
                Your kit is empty. Add an item below to begin.
              </div>
            )}
          </div>
          <aside className="ggh-combo-summary">
            <h2>Kit summary</h2>
            <p>
              {count} items from {selected.length} products
            </p>
            <div>
              <span>Estimated items total</span>
              <strong>{formatMoney(total)}</strong>
            </div>
            <small>
              Illustrative prices. Large quantities need seller confirmation;
              delivery, taxes and stock are not verified.
            </small>
            <button
              type="button"
              className="ggh-primary-action"
              disabled={!count}
              onClick={() => {
                setNotice(
                  addKit(
                    combo.id,
                    Object.fromEntries(
                      selected.map((part) => [part.id, selection[part.id]]),
                    ),
                  )
                    ? `${combo.name} added as one editable kit to your browser-only bag.`
                    : "Some selected products are already in another kit. Remove them there before adding this kit.",
                );
              }}
            >
              Add kit to bag <StoreIcon name="arrow" size={17} />
            </button>
            {notice && (
              <p role="status">
                {notice} <Link href="/shop/cart">View bag →</Link>
              </p>
            )}
          </aside>
        </div>
      </section>
      <section className="ggh-combo-extras">
        <div className="ggh-page-section-head">
          <div>
            <p className="ggh-page-eyebrow">Add a little more</p>
            <h2>Extras for your kit</h2>
          </div>
        </div>
        <div className="ggh-combo-extra-grid">
          {comboParts
            .filter((part) => !selection[part.id])
            .map((part) => (
              <article key={part.id}>
                <div className="ggh-combo-extra-photo">
                  <Image
                    src={part.image}
                    alt={part.name}
                    fill
                    sizes="(max-width: 600px) 45vw, 180px"
                  />
                </div>
                <h3>{part.name}</h3>
                <p>{formatMoney(part.price)}</p>
                <button type="button" onClick={() => setQuantity(part.id, 1)}>
                  + Add to kit
                </button>
              </article>
            ))}
        </div>
      </section>
    </>
  );
}
