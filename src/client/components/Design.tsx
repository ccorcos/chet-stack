import { compact } from "lodash"
import React, { useCallback, useMemo, useRef, useState } from "react"
import { FuzzyMatch, fuzzyMatch } from "../../shared/fuzzyMatch"
import { isShortcut, useShortcut } from "../hooks/useShortcut"
import { useClientEnvironment } from "../services/ClientEnvironment"
import { FuzzyString } from "./ui/FuzzyString"
import { Input } from "./ui/Input"
import { ListBox, ListItem } from "./ui/ListBox"

import * as demos from "./ui/demos/autoindex"

export function Design(props: { page: string | undefined }) {
	const { router } = useClientEnvironment()

	const currentPage = props.page || Object.keys(demos)[0]
	const setCurrentPage = (page: string) => router.navigate({ type: "design", page })

	// Layout is a full-page demo.
	if (currentPage === "LayoutDemo") {
		return React.createElement(demos.LayoutDemo.LayoutDemo)
	}

	return (
		<Layout
			sidebar={<Sidebar currentPage={currentPage} setCurrentPage={setCurrentPage} />}
			content={
				demos[currentPage] ? (
					React.createElement(demos[currentPage][currentPage])
				) : (
					<div>Select a page</div>
				)
			}
		/>
	)
}

function Layout(props: { sidebar: React.ReactNode; content: React.ReactNode }) {
	return (
		<div
			style={{
				display: "grid",
				gridTemplateColumns: "250px 1fr",
				// gridGap: "20px",
				height: "100vh",
			}}
		>
			{props.sidebar}
			<div>{props.content}</div>
		</div>
	)
}

function Sidebar(props: { currentPage: string; setCurrentPage: (currentPage: string) => void }) {
	const pageNames = Object.keys(demos)

	const [value, setValue] = useState("")

	const results: { pageName: string; match?: FuzzyMatch }[] = useMemo(() => {
		if (value === "") return pageNames.map((pageName) => ({ pageName }))
		return compact(
			pageNames.map((pageName) => {
				const match = fuzzyMatch(value, pageName)
				if (match) return { pageName, match }
			})
		)
	}, [value])

	const selectedIndex = useMemo(() => {
		return results.findIndex(({ pageName }) => pageName === props.currentPage)
	}, [results, props.currentPage, value])

	const setSelectedIndex = useCallback(
		(index: number) => {
			return props.setCurrentPage(results[index].pageName)
		},
		[results]
	)

	const input = useRef<HTMLInputElement>(null)

	useShortcut("cmd-p", () => {
		input.current?.focus()
	})

	return (
		<div>
			<Input
				ref={input}
				type="search"
				style={{ width: "calc(100% - 1em)", margin: "0.5em" }}
				placeholder="Search..."
				value={value}
				onChange={(e) => setValue(e.target.value)}
				onKeyDown={(e) => {
					if (isShortcut("down", e.nativeEvent)) {
					} else if (isShortcut("up", e.nativeEvent)) {
					} else {
					}
				}}
			/>

			<ListBox
				items={results}
				selectedIndex={selectedIndex}
				onSelectIndex={setSelectedIndex}
				autoFocus={true}
			>
				{(item, props) => (
					<ListItem {...props} style={{ padding: "0.5em" }}>
						{item.match ? <FuzzyString match={item.match} /> : item.pageName}
					</ListItem>
				)}
			</ListBox>
		</div>
	)
}
