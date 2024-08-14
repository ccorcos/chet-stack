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

function isMatch(matchItem: MatchItem): matchItem is { match: string } {
	return "match" in matchItem
}

export function fuzzyMatchScore(query: string, text: string) {
	const match = fuzzyMatch(query, text)
	if (!match) return 0

	const matchingLetters = match.reduce((score, current) => {
		if (isMatch(current)) {
			return score + current.match.length
		}
		return score
	}, 0)

	const normalizedScore = (matchingLetters * 2) / (query.length + text.length)

	return normalizedScore
}

export function fuzzyMatch(query: string, text: string) {
	const result = fuzzyMatchHelper(query, text)
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

export function computeMatchScore(match: FuzzyMatch) {
	// This scoring is kind of an arbitrary idea.
	// Quatratic sum of the size of the length of the matches.
	// Discounted by how far from the beginning the match is.
	return Math.sqrt(
		match
			.map((item, i) => {
				if ("match" in item) return Math.pow(item.match.length, 2) / Math.sqrt(i + 1)
				else return 0
			})
			.reduce((a, b) => a + b, 0)
	)
}
