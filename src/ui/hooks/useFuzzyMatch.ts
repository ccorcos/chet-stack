import { useMemo } from "react"
import { fuzzyMatch } from "shared/fuzzyMatch"

export function useFuzzyMatch(args: { items: string[]; without?: string[]; filter?: string }) {
	const { filter, items, without } = args

	const filteredItems = useMemo(() => {
		let result = items

		// Remove items that are already selected.
		if (without) result = result.filter((str) => !without.includes(str))

		// If the text is empty, show all items.
		if (!filter) return result.map((str) => ({ value: str, match: [{ skip: str }] }))

		// Fuzzy match items.
		return result
			.map((str) => ({ value: str, match: fuzzyMatch(filter, str)! }))
			.filter(({ match }) => Boolean(match))
	}, [filter, items, without])

	return filteredItems
}

export function useFuzzyMatch2<T>(args: { items: T[]; text: (item: T) => string; query: string }) {
	const { query, items, text } = args

	const filteredItems = useMemo(() => {
		let result = items

		// If the text is empty, show all items.
		if (!query) return result.map((value) => ({ value, match: [{ skip: text(value) }] }))

		// Fuzzy match items.
		return result
			.map((value) => ({ value, match: fuzzyMatch(query, text(value))! }))
			.filter(({ match }) => Boolean(match))
	}, [query, items])

	return filteredItems
}
