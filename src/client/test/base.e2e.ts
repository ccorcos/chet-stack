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

async function login(page: Page, username: string, password: string) {
	await page.goto("/login")
	await write(page, ".login input.username", username)
	await write(page, '.login input[type="password"]', password)
	await click(page, '.login button[type="submit"]')
}

async function signup(page: Page, username: string, password: string) {
	await page.goto("/login")
	await write(page, ".signup input.username", username)
	await write(page, '.signup input[type="password"]', password)
	await click(page, '.signup button[type="submit"]')
}

async function logout(page: Page) {
	await page.goto("/logout")
}

test("Smoke Test", async ({ browser }) => {
	const chetContext = await browser.newContext()
	const samContext = await browser.newContext()
	const chet = await chetContext.newPage()
	const sam = await samContext.newPage()

	await chet.goto("/")
	await sam.goto("/")

	await signup(chet, "chet", "1234")
	await signup(sam, "sam", "1234")

	await click(sam, 'button:text("New Thread")')

	await write(sam, 'input[placeholder="Add member..."]', "ch")
	await waitFor(sam, '.popup > .menu-item:has-text("chet")')
	await sam.keyboard.press("Enter")

	await write(sam, "input.subject", "Friends")

	await click(chet, '*[role="listitem"] > *:has-text("Friends")')

	await write(sam, "input.reply", "Hello there!")
	await sam.keyboard.press("Enter")

	await waitFor(chet, '.message > *:has-text("Hello there!")')
})
