import { Page, test } from "@playwright/test"

async function waitFor(page: Page, selector: string) {
	const element = await page.waitForSelector(selector)
	if (!element) throw new Error("Element not found: " + selector)
	return element
}

async function write(page: Page, selector: string, value: string) {
	const input = await waitFor(page, selector)
	await input.fill(value)
	await input.focus()
	return input
}

async function click(page: Page, selector: string) {
	const button = await waitFor(page, selector)
	await button.click()
	return button
}

test("Smoke Test", async ({ browser }) => {
	const context = await browser.newContext()
	const page = await context.newPage()
	await page.goto("/")
	await waitFor(page, "body")
})
