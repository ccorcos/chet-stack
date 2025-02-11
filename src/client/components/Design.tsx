import React, { Suspense, useRef, useState } from "react"
import { useShortcut } from "../hooks/useShortcut"
import { useClientEnvironment } from "../services/ClientEnvironment"
import { FuzzyString } from "./ui/FuzzyString"
import { Input } from "./ui/Input"
import { ListBox, ListItem, useListBox } from "./ui/ListBox"

import { formatRoute } from "../../shared/routeHelpers"
import { useFuzzyMatch } from "../hooks/useFuzzyMatch"
import { useInputAutocomplete } from "../hooks/useInputAutocomplete"
import * as demos from "./ui/demos/autoindex"
import { ContentLayout, Layout, LeftPanelLayout } from "./ui/Layout"
import { MenuItem } from "./ui/MenuItem"

export function Design(props: { params: Record<string, string> }) {
	const { router } = useClientEnvironment()
	const { params } = props

	const currentPage = params.page || Object.keys(demos)[0]
	const setCurrentPage = (page: string | undefined) =>
		router.navigate(formatRoute({ type: "design", params: page ? { page } : {} }))

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

function Sidebar(props: {
	currentPage: string
	setCurrentPage: (currentPage: string | undefined) => void
}) {
	const { currentPage, setCurrentPage } = props

	const pageNames = Object.keys(demos)
	const [searchText, setSearchText] = useState("")

	const input = useRef<HTMLInputElement>(null)
	useShortcut("cmd-p", () => {
		input.current?.focus()
	})

	const filteredItems = useFuzzyMatch({
		items: pageNames,
		filter: searchText,
	})

	const onSubmit = (value: string) => {
		setCurrentPage(value)
		setSearchText("")
	}

	const [selectedIndex, setSelectedIndex] = useState(0)

	const { onKeyDown } = useInputAutocomplete({
		selectedIndex,
		setSelectedIndex,
		items: filteredItems,
		onSubmit: ({ value }) => onSubmit(value),
	})

	return (
		<LeftPanelLayout show={true}>
			<Input
				ref={input}
				type="search"
				style={{ width: "calc(100% - 1em)", margin: "0.5em" }}
				placeholder="Search..."
				value={searchText}
				onChange={(e) => setSearchText(e.target.value)}
				onKeyDown={onKeyDown}
			/>

			{searchText === "" ? (
				<PageListBox
					pageNames={pageNames}
					currentPage={currentPage}
					setCurrentPage={setCurrentPage}
				/>
			) : (
				<div>
					{filteredItems.map(({ value: pageName, match }, i) => (
						<MenuItem
							key={pageName}
							className="feedback"
							selected={selectedIndex === i}
							onClick={() => onSubmit(pageName)}
							onMouseDown={(e) => e.preventDefault()}
							onMouseEnter={() => setSelectedIndex(i)}
							style={{
								padding: "0.5em",
								backgroundColor: selectedIndex === i ? "var(--gray6)" : undefined,
							}}
						>
							<FuzzyString match={match} />
						</MenuItem>
					))}
				</div>
			)}
		</LeftPanelLayout>
	)
}

function PageListBox(props: {
	pageNames: string[]
	currentPage: string
	setCurrentPage: (currentPage: string | undefined) => void
}) {
	const { pageNames, currentPage, setCurrentPage } = props

	const { onClick, onKeyDown } = useListBox({
		list: pageNames,
		selected: currentPage,
		setSelected: setCurrentPage,
	})

	return (
		<ListBox onClick={onClick} onKeyDown={onKeyDown}>
			{pageNames.map((pageName) => (
				<ListItem
					key={pageName}
					item={pageName}
					selected={pageName === props.currentPage}
					style={{ padding: "0.5em" }}
					className="feedback"
				>
					{pageName}
				</ListItem>
			))}
		</ListBox>
	)
}
