import { readFileSync } from "fs"
import { groupBy } from "lodash"
import { BloomFilter } from "../../shared/BloomFilter"
import { randomId } from "../../shared/randomId"
import { simplifyVCard, vCard } from "../../shared/vCardHelpers"
import { path } from "../helpers/path"
import { Database } from "../services/Database"

function logNames(cards: vCard[]) {
	for (const card of cards) console.log(card.data.fn?.toString())
}

function logMissingNames(cards: vCard[]) {
	for (const card of cards) {
		if (!card.data.fn) console.log(card.toString())
	}
}

function logDuplicateNames(cards: vCard[]) {
	const byName = groupBy(cards, "data.fn")
	for (const [name, cards] of Object.entries(byName)) {
		if (cards.length > 1) {
			console.log(`${name}: ${cards.length} occurrences`)
			console.log(cards.map((c) => c.toString()))
			console.log("")
		}
	}
}

function logDuplicateCards(cards: vCard[]) {
	const results: { filter: string; keys: string[]; card: vCard }[] = []

	// Bloom filter the properties for comparison.
	for (const vcard of cards) {
		const card = vcard.toJSON()[1]

		// name, org, email, phone, address
		const names = card.filter((x) => x[0] === "fn").map((x) => x[3] as string)
		const orgs = card.filter((x) => x[0] === "org").map((x) => x[3].slice(0, -1) as string)
		const emails = card.filter((x) => x[0] === "email").map((x) => x[3] as string)
		const phones = card.filter((x) => x[0] === "tel").map((x) => x[3].toString().replace(/\D/g, ""))
		const addresses = card
			.filter((x) => x[0] === "adr")
			.map((x) => (x[3] as string[]).filter(Boolean).join(" "))
		const keys = [...names, ...orgs, ...emails, ...phones, ...addresses]

		const filter = new BloomFilter(2048, 2)
		for (const key of keys) filter.add(key)

		results.push({ filter: filter.toString(), card: vcard, keys })
	}

	const pairs: { a: any; b: any; similarity: number }[] = []
	for (let i = 0; i < results.length; i++) {
		const a = results[i]
		for (let j = i + 1; j < results.length; j++) {
			const b = results[j]
			const similarity = compareFilters(a.filter, b.filter)
			pairs.push({ a, b, similarity })
		}
	}
	pairs.sort((a, b) => b.similarity - a.similarity)

	pairs
		.filter((pair) => pair.similarity >= 0.2)
		.forEach((pair) => {
			console.log(`${pair.similarity}\n ${pair.a.keys}\n ${pair.b.keys}\n`)
		})
}

function logKeys(cards: vCard[]) {
	const keys = new Set<string>()
	for (const card of cards) {
		card.toJSON()[1].forEach((x) => {
			keys.add(x[0])
		})
	}
	console.log(Array.from(keys))
}

function compareFilters(a: string, b: string) {
	let total = 0
	let match = 0
	for (let i = 0; i < a.length; i++) {
		if (a[i] !== "0" || b[i] !== "0") total += 1
		if (a[i] !== "0" && b[i] !== "0") match += 1
	}
	return match / total
}

export function importAppleContacts(db: Database) {
	const vcf = readFileSync(path("data/appleContacts.vcf"), "utf-8")

	let cards = vcf
		.split("BEGIN:VCARD")
		.filter(Boolean)
		.map((card) => "BEGIN:VCARD" + card)

	const set = cards.map((card) => ({ key: `vcard/${randomId(card)}`, value: card }))
	console.log("Importing", set.length, "vCards")
	db.write({ set })
}

export function indexVCards(db: Database) {
	const vcards = db.list({ gt: "vcard/", lt: "vcard/\xff" })

	const sets: { key: string; value: any }[] = []
	for (const { key, value } of vcards) {
		const { name, org, emails, phones } = simplifyVCard(value)
		if (name) sets.push({ key: `name/${name}:${key}`, value: "" })
		if (org) sets.push({ key: `org/${org}:${key}`, value: "" })
		for (const email of emails) sets.push({ key: `email/${email}:${key}`, value: "" })
		for (const phone of phones) sets.push({ key: `phone/${phone}:${key}`, value: "" })
	}

	db.write({ set: sets })
}
