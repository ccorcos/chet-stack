import { sortBy } from "lodash"
import React, { useState } from "react"
import { fuzzyMatch, fuzzyMatchScore2 } from "../../../../shared/fuzzyMatch"
import { FuzzyString } from "../FuzzyString"
import { Input } from "../Input"

const books = [
	"The Ascent of Money by Niall Ferguson",
	"The Origins of Political Order by Francis Fukuyama",
	"A History of the World in 6 Glasses",
	"A People's History of the United States",
	"Enlightenment Now by Steven Pinker",
	"Amusing Ourselves to Death",
	"The Elephant in the Brain",
	"Scale by Geoffrey West",
	"The Precipice: Existential Risk and the Future of Humanity",
	"Trust Me, I'm Lying by Ryan Holiday",
	"How to Change Your Mind by Michael Pollan",
	"Extortion: How politicians extract your money, buy votes, and line their own pockets",
	"Why We Sleep",
	"Stuff Matters",
	"Smaller Faster Lighter Denser Cheaper",
]

export function FuzzyStringDemo() {
	const [value, setValue] = useState("am")

	const matches = books.map((book) => fuzzyMatch(value, book) || book)
	const sorted = sortBy(matches, (match) =>
		typeof match === "string" ? Infinity : -fuzzyMatchScore2(match)
	)

	return (
		<div style={{ padding: 12 }}>
			<Input value={value} onChange={(e) => setValue(e.target.value)} />
			<ul>
				{sorted.map((book, i) => {
					if (typeof book === "string")
						return (
							<li key={i} style={{ color: "var(--text-color3)" }}>
								{book}
							</li>
						)
					return (
						<li key={i}>
							<FuzzyString match={book} /> - {fuzzyMatchScore2(book).toFixed(2)}
						</li>
					)
				})}
			</ul>
		</div>
	)
}
