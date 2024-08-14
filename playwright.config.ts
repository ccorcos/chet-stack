import { defineConfig, devices } from "@playwright/test"

const CI = Boolean(process.env.CI)
const DB_PATH = `db/data-${Math.round(Math.random() * 1e10)}.json`

export default defineConfig({
	// Look for test files in the "tests" directory, relative to this configuration file.
	testDir: "src",
	testMatch: /.*\.e2e\.(ts|tsx)/,
	reporter: [["list"], ["html", { open: CI ? "never" : "on-failure" }]],
	// fullyParallel: true,
	forbidOnly: CI,

	retries: 0,

	expect: {
		timeout: CI ? 5000 : 1000,
	},
	timeout: CI ? 18000 : 6000,

	use: {
		headless: false, // Run browser in headful mode

		// Base URL to use in actions like `await page.goto('/')`.
		baseURL: "http://localhost:8080",

		// Collect trace when retrying the failed test.
		trace: "on-first-retry",
	},
	// Configure projects for major browsers.
	projects: [
		{
			name: "chromium",
			use: { ...devices["Desktop Chrome"] },
		},
	],
	// Run your local dev server before starting the tests.
	webServer: {
		command: `DB_PATH='${DB_PATH}' npm start`,
		url: "http://localhost:8080",
		// reuseExistingServer: !CI,
	},
})
