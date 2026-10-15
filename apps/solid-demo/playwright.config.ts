import { defineConfig, devices } from "@playwright/test";

// Visual checks against the demo. Reuses a running dev server on port 3000, or starts one.
// Set CHROMIUM_PATH to use a system Chromium instead of Playwright's download.
const executablePath = process.env.CHROMIUM_PATH;

export default defineConfig({
    testDir: "./e2e",
    snapshotPathTemplate: "{testDir}/__screenshots__/{testFilePath}/{arg}{ext}",
    fullyParallel: true,
    reporter: "list",
    expect: { toHaveScreenshot: { maxDiffPixelRatio: 0.002 } },
    use: {
        baseURL: "http://localhost:3000",
        viewport: { width: 1280, height: 900 },
        ...(executablePath ? { launchOptions: { executablePath } } : {}),
    },
    projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
    webServer: {
        command: "bunx vite --port 3000",
        // The app answers / only for html requests, so probe a file vite always serves.
        url: "http://localhost:3000/@vite/client",
        reuseExistingServer: true,
    },
});
