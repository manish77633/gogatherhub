import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  fullyParallel: false,
  workers: 1,
  timeout: 60000,
  use: { baseURL: "http://localhost:4311" },
  projects: [
    { name: "chromium", use: { browserName: "chromium" } },
    { name: "firefox", use: { browserName: "firefox" } },
    { name: "webkit", use: { browserName: "webkit" } },
  ],
  webServer: [
    { command: "node tests/mock-api.cjs", port: 4310 },
    { command: "npm run dev -- --port 4311", port: 4311, timeout: 120000,
      env: { API_INTERNAL_URL: "http://localhost:4310", TAB_SESSIONS: "true", NEXT_TEST_DIST_DIR: ".next-e2e",
        GOOGLE_CLIENT_ID: "test-client", GOOGLE_CLIENT_SECRET: "test-secret" } },
  ],
});
