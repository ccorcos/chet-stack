type MatchItem = { match: string } | { skip: string }

export type FuzzyMatch = MatchItem[]

function eq(a: string, b: string) {
	return a.toLowerCase() === b.toLowerCase()
}

function fuzzyMatchHelper(
	query: string,
	text: string,
	qi: number = 0,
	ti: number = 0
): FuzzyMatch | undefined {
	if (query === "") {
		return [{ skip: text }]
	}

	if (ti >= text.length || qi >= query.length) {
		// If we didn't get through the queryText, this is not a match.
		if (qi < query.length) {
			return undefined
		}

		// Skip the rest of the text.
		if (ti < text.length) {
			return [{ skip: text.slice(ti) }]
		}

		return []
	}

	// Greedily match this character.
	if (eq(text[ti], query[qi])) {
		const item = { match: text[ti] }
		const rest = fuzzyMatchHelper(query, text, qi + 1, ti + 1)
		if (rest) {
			// Its possible that greedy matching doesn't work.
			// For example: query: "abcd", text: "abc bcd"
			return [item, ...rest]
		}
	}

	if (!/\w/.test(text[ti])) {
		// If this is a symbol, then skip.
		const item = { skip: text[ti] }
		const rest = fuzzyMatchHelper(query, text, qi, ti + 1)
		if (rest) {
			return [item, ...rest]
		}
	}

	// Skip the rest of the word as well.
	const skip: FuzzyMatch = []
	let i = ti
	skip.push({ skip: text[i] })
	i++
	while (i < text.length && /\w/.test(text[i])) {
		skip.push({ skip: text[i] })
		i++
	}

	const rest = fuzzyMatchHelper(query, text, qi, i)
	if (rest) {
		return [...skip, ...rest]
	}
}

export function fuzzyMatch(query: string, text: string) {
	const trimmed = query.trim()
	if (trimmed === "") return
	const result = fuzzyMatchHelper(trimmed, text)
	if (result) return reduceMatches(result)
}

function reduceMatches(items: FuzzyMatch): FuzzyMatch {
	// Accumulate the results.
	const [first, ...rest] = items
	return rest.reduce(
		(prev, next) => {
			// Reduce together consecutive matches/skips.
			const last = prev[prev.length - 1]
			if ("match" in last) {
				if ("match" in next) {
					return [...prev.slice(0, prev.length - 1), { match: last.match + next.match }]
				} else {
					return [...prev, next]
				}
			} else {
				if ("skip" in next) {
					return [...prev.slice(0, prev.length - 1), { skip: last.skip + next.skip }]
				} else {
					return [...prev, next]
				}
			}
		},
		[first]
	)
}

// TODO: These scoring functions are pretty arbitrary currently...

/**
 * matchedChars^2 / textLength
 * This is ok, but really discounts matching long text.
 */
export function fuzzyMatchScore(match: FuzzyMatch | undefined) {
	if (!match) return 0

	let matched = 0
	let unmatched = 0

	for (const item of match) {
		if ("match" in item) {
			matched += item.match.length
		} else {
			unmatched += item.skip.length
		}
	}

	const normalizedScore = matched ** 2 / (matched + unmatched)

	return normalizedScore
}

/**
 * sum(matchedChars^2 / distanceFromStart^(1/2))^(1/2)
 * Weighted on bigger matches closer to the beginning of the string.
 */
export function fuzzyMatchScore2(match: FuzzyMatch | undefined) {
	// This scoring is kind of an arbitrary idea.
	// Quatratic sum of the size of the length of the matches.
	// Discounted by how far from the beginning the match is.

	if (!match) return 0

	let score = 0

	for (let i = 0; i < match.length; i++) {
		const item = match[i]
		if ("match" in item) {
			score += Math.pow(item.match.length, 2) / Math.sqrt(i + 1)
		}
	}

	return Math.sqrt(score)
}
