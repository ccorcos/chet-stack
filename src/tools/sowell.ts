/*

npx tsx src/tools/sowell.ts

*/

import * as cheerio from "cheerio"
import { Database } from "database/Database"
import { URL } from "node:url"
import { config } from "server/services/ServerConfig"
import { sleep } from "shared/sleep"
import { tupleDb, tupleOkv, tupleTx } from "tupledb/TupleDb"
import { TupleDb } from "tupledb/types"

const db = tupleDb(tupleOkv(new Database(config.dbPath)))

const startUrl = "https://www.tsfreemind.com"

async function loadPage(url: string) {
	const response = await fetch(url)
	const html = await response.text()
	return html
}

function parseLinks(url: string, html: string) {
	const $ = cheerio.load(html)

	// Find all links
	const internal = new Set<string>()
	const external = new Set<string>()

	$("a").each((_, element) => {
		const href = $(element).attr("href")
		if (href) {
			try {
				const absoluteUrl = new URL(href, url).toString()
				if (absoluteUrl.startsWith(startUrl)) {
					internal.add(absoluteUrl)
				} else {
					external.add(absoluteUrl)
				}
			} catch (e) {
				// Skip invalid URLs
			}
		}
	})

	return { internal: Array.from(internal), external: Array.from(external) }
}

async function start(url: string) {
	enqueue(db, url)
	await crawl()
}

const enqueue = (db: TupleDb, url) => {
	if (db.has(["queue", url])) return
	if (db.has(["link", url])) return
	db.set(["queue", url], null)
}

const next = (db: TupleDb) => {
	const queue = db.list({ gt: ["queue"], lt: ["queue", null], limit: 1 })
	if (queue.length === 1) {
		const url = queue[0].key.at(-1)
		return url
	}
}

async function crawl() {
	while (true) {
		const url = next(db)
		if (!url) return

		console.log(`Crawling ${url}`)
		const html = await loadPage(url)
		const { internal, external } = parseLinks(url, html)

		const tx = tupleTx(db)
		tx.delete(["queue", url])
		tx.set(["link", url], { html, internal, external })
		for (const link of internal) enqueue(tx, link)
		for (const link of external) tx.set(["external", link], null)
		tx.commit()

		// Small delay to be nice to the server
		await sleep(400)
	}
}

// Check if this module is being run directly
if (import.meta.url === `file://${process.argv[1]}`) {
	// const args = process.argv.slice(2)
	// const startUrl = args[0]
	// if (!startUrl) {
	// 	console.error("Please provide a starting URL")
	// 	process.exit(1)
	// }

	console.log(`Starting crawl from ${startUrl}`)
	await start(startUrl)
}
