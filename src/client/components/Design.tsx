import { compact } from "lodash"
import React, { Suspense, useCallback, useMemo, useRef, useState } from "react"
import { FuzzyMatch, fuzzyMatch } from "../../shared/fuzzyMatch"
import { isShortcut, useShortcut } from "../hooks/useShortcut"
import { useClientEnvironment } from "../services/ClientEnvironment"
import { FuzzyString } from "./ui/FuzzyString"
import { Input } from "./ui/Input"
import { ListBox, ListItem, useListBox } from "./ui/ListBox"

import { formatRoute } from "../../shared/routeHelpers"
import { ContentLayout, Layout, LeftPanelLayout } from "./ui/Layout"
import * as demos from "./ui/demos/autoindex"

export function Design(props: { params: Record<string, string> }) {
	const { router } = useClientEnvironment()
	const { params } = props

	const currentPage = params.page || Object.keys(demos)[0]
	const setCurrentPage = (page: string) =>
		router.navigate(formatRoute({ type: "design", params: { page } }))

	// Layout is a full-page demo.
	if (currentPage === "LayoutDemo") {
		return React.createElement(demos.LayoutDemo.LayoutDemo, { params })
	}

	return (
		<Layout LeftPanel={<Sidebar currentPage={currentPage} setCurrentPage={setCurrentPage} />}>
			<Suspense fallback={<div>Loading...</div>}>
				<ContentLayout>
					{demos[currentPage] ? (
						React.createElement(demos[currentPage][currentPage], { params })
					) : (
						<div>Select a page</div>
					)}
				</ContentLayout>
			</Suspense>
		</Layout>
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

	const selected = useMemo(() => {
		return new Set([props.currentPage])
	}, [results, props.currentPage, value])

	const setSelected = useCallback(
		(keys: Set<string>) => {
			props.setCurrentPage(Array.from(keys)[0])
		},
		[props.setCurrentPage]
	)

	const input = useRef<HTMLInputElement>(null)

	useShortcut("cmd-p", () => {
		input.current?.focus()
	})

	const items = results.map(({ pageName }) => pageName)
	const { onClick, onKeyDown } = useListBox({
		list: items,
		selected,
		setSelected,
	})

	// TODO: this input doesnt work correctly because it should really be a dropdown
	// the focus is on the input, not the listbox...

	return (
		<LeftPanelLayout show={true}>
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

			<ListBox onClick={onClick} onKeyDown={onKeyDown}>
				{results.map(({ pageName, match }) => (
					<ListItem
						key={pageName}
						item={pageName}
						selected={pageName === props.currentPage}
						style={{ padding: "0.5em" }}
					>
						{match ? <FuzzyString match={match} /> : pageName}
					</ListItem>
				))}
			</ListBox>
		</LeftPanelLayout>
	)
}
