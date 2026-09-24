import { defineConfig, devices } from "@playwright/test";

const base = process.env.BASE_PATH || "/";
export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  timeout: 30000,
  retries: 0,
  use: { baseURL: `http://127.0.0.1:4173${base}`, trace: "retain-on-failure" },
  projects: [
    {
      name: "chromium-phone",
      use: {
        ...devices["iPhone 13"],
        defaultBrowserType: "chromium",
        browserName: "chromium",
      },
    },
    {
      name: "webkit-phone",
      use: { ...devices["iPhone 13"], browserName: "webkit" },
    },
  ],
  webServer: {
    command: "npm run preview -- --port 4173 --strictPort",
    url: `http://127.0.0.1:4173${base}`,
    reuseExistingServer: false,
    env: { DISABLE_PRIVATE_SETUP: "1" },
  },
});
