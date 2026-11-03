// Match authentication isolation, including the legacy-flow rollback switch.
export function commerceStorage(): Storage {
  return document.body.dataset.tabSessions === "true" ? sessionStorage : localStorage;
}
