import { useMemo } from "react"
import { fuzzyMatch, FuzzyMatch } from "shared/fuzzyMatch"
import { useRefCurrent } from "./useRefCurrent"

export function useFuzzyMatch<T extends string>(args: {
	items: T[]
	query: string
}): { value: T; match: FuzzyMatch }[]
export function useFuzzyMatch<T>(args: {
	items: T[]
	text: (item: T) => string
	query: string
}): { value: T; match: FuzzyMatch }[]
export function useFuzzyMatch<T>(args: { items: T[]; text?: (item: T) => string; query: string }) {
	const { query, items } = args

	const textRef = useRefCurrent(args.text)

	const filteredItems = useMemo(() => {
		let result = items

		// Default text extractor for strings
		const text = textRef.current || ((item: T) => item as string)

		// If the text is empty, show all items.
		if (!query) return result.map((str) => ({ value: str, match: [{ skip: text(str) }] }))

		// Fuzzy match items.
		return result
			.map((value) => ({ value, match: fuzzyMatch(query, text(value))! }))
			.filter(({ match }) => Boolean(match))
	}, [query, items])

	return filteredItems
}
