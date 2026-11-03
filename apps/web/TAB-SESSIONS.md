# Independent account sessions in browser tabs

Enabled by default. Each tab keeps a random selector in sessionStorage and carries it as `ggh_tab` in page URLs and an `x-ggh-tab` header on same-origin requests. The selector is routing context, not a login token. Credentials remain in separate HttpOnly cookies; the frontend forwards only the selected cookie to the API. Server role checks and database session revocation still apply.

Open the normal site link in a new tab and sign in there. Buyer, seller and administrator accounts can run simultaneously. Refresh preserves the tab session. Closing a tab ends access from that tab; reopening a fresh tab requires login. A restored browser session may retain tab storage. Modern browsers support collision detection for duplicated tabs through BroadcastChannel.

Cart, wishlist and selected product variants use tab-local storage; the authenticated database cart/wishlist remain attached to the user. Existing browser-local guest carts are not imported across tab sessions. Session tokens are never written to URL parameters or browser storage. Google OAuth uses a separate expiring, HttpOnly state cookie for each attempt, while the authorized callback URL stays unchanged.

## Rollback

Set `TAB_SESSIONS=false` in Vercel and redeploy. This restores shared-cookie authentication and the previous shared browser commerce storage. No Render or Google Console change or database migration is required. Users may need to sign in again when switching modes. Existing tab cookies expire normally; rollback does not convert them into shared sessions.

## Verification

Run `npx playwright test` from apps/web. Tests start an isolated Next instance and a mock backend, exercising actual browser cookies, form submission, navigation, server role checks, reload, logout, separate tabs and Google state setup in Chromium, Firefox and WebKit. These are frontend integration tests: live Google token exchange, real Render/database integration and physical iOS/Android devices require deployment verification.
