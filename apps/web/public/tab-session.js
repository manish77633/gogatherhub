/* Runs before application hydration. Session credentials stay in HttpOnly cookies. */
(() => {
  const key = "ggh_tab", pattern = /^[a-f0-9]{32}$/;
  let tab;
  try {
    tab = sessionStorage.getItem(key);
    if (!pattern.test(tab || "")) {
      tab = Array.from(crypto.getRandomValues(new Uint8Array(16)), b => b.toString(16).padStart(2, "0")).join("");
      sessionStorage.setItem(key, tab);
    }
  } catch {
    // Fail closed if the browser blocks tab storage.
    document.documentElement.textContent = "Allow site storage to sign in to this website.";
    return;
  }
  function scoped(value) {
    const url = new URL(value, location.href);
    if (url.origin === location.origin && !url.pathname.startsWith("/_next/") && !/\.[a-z0-9]+$/i.test(url.pathname)) url.searchParams.set(key, tab);
    return url;
  }
  const current = new URL(location.href);
  if (current.searchParams.get(key) !== tab) {
    location.replace(scoped(location.href));
    return;
  }
  function clearCommerce() {
    for (const name of ["ggh-demo-cart", "ggh-demo-kits", "ggh-demo-wishlist", "ggh-cart-variants", "ggh_checkout_attempt"]) sessionStorage.removeItem(name);
    dispatchEvent(new Event("ggh-demo-change"));
  }
  if (current.searchParams.has("ggh_reset_commerce")) {
    clearCommerce();
    current.searchParams.delete("ggh_reset_commerce");
    history.replaceState(history.state, "", current.href);
  }
  // Duplicating a tab can copy sessionStorage. The existing document keeps its
  // session; the newly opened document starts a fresh one before sending APIs.
  let ready = Promise.resolve();
  if (typeof BroadcastChannel !== "undefined") {
    const channel = new BroadcastChannel("ggh-tab-ownership");
    const instance = Array.from(crypto.getRandomValues(new Uint8Array(8)), b => b.toString(16).padStart(2, "0")).join("");
    const born = performance.timeOrigin;
    ready = new Promise(resolve => {
      let reset = false;
      channel.onmessage = ({ data }) => {
        if (!data || data.tab !== tab || data.instance === instance) return;
        if (data.kind === "probe") channel.postMessage({ kind: "owner", tab, instance, born });
        if (data.born < born || (data.born === born && data.instance < instance)) {
          if (reset) return;
          reset = true;
          sessionStorage.clear();
          const url = new URL(location.href); url.searchParams.delete(key);
          location.replace(url);
        }
      };
      channel.postMessage({ kind: "probe", tab, instance, born });
      setTimeout(() => { if (!reset) resolve(); }, 120);
    });
    addEventListener("pagehide", () => channel.close(), { once: true });
    addEventListener("pageshow", event => { if (event.persisted) location.reload(); });
  }
  const originalFetch = window.fetch;
  window.fetch = function(input, init) {
    const url = new URL(input instanceof Request ? input.url : input, location.href);
    if (url.origin !== location.origin) return originalFetch.call(this, input, init);
    const headers = new Headers(init?.headers ?? (input instanceof Request ? input.headers : undefined));
    headers.set("x-ggh-tab", tab);
    return ready.then(() => originalFetch.call(this, input, { ...init, headers })).then(response => {
      if (response.headers.get("x-ggh-reset-commerce") === "1") {
        clearCommerce();
      }
      return response;
    });
  };
  for (const method of ["pushState", "replaceState"]) {
    const original = history[method];
    history[method] = function(state, unused, url) {
      return original.call(this, state, unused, url == null ? url : scoped(url).href);
    };
  }
  document.addEventListener("click", event => {
    const link = event.target.closest?.("a[href]");
    if (link && !link.hasAttribute("download") && (!link.target || link.target === "_self")) link.href = scoped(link.href).href;
  }, true);
  document.addEventListener("submit", event => {
    const form = event.target;
    if (form instanceof HTMLFormElement) {
      form.action = scoped(form.action).href;
      if (form.method.toLowerCase() === "get") {
        let field = form.querySelector('input[name="ggh_tab"]');
        if (!field) { field = document.createElement("input"); field.type = "hidden"; field.name = key; form.appendChild(field); }
        field.value = tab;
      }
    }
  }, true);
})();
