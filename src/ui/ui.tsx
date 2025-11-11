import "ui/client.css"
import "ui/theme.css"

import React, { Suspense, useRef, useState } from "react"
import { createRoot } from "react-dom/client"
import { formatRoute, parseRoute } from "shared/routeHelpers"
import { FuzzyString } from "./components/FuzzyString"
import { Input } from "./components/Input"
import { ContentLayout, Layout, LeftPanelLayout } from "./components/Layout"
import { ListBox, ListItem, useListBox } from "./components/ListBox"
import { MenuItem } from "./components/MenuItem"
import * as demos from "./demos"
import { useClampedState } from "./hooks/useClampedState"
import { useFuzzyMatch } from "./hooks/useFuzzyMatch"
import { useInputAutocomplete } from "./hooks/useInputAutocomplete"
import { useKeyboardMode } from "./hooks/useKeyboardMode"
import { useWindowShortcuts } from "./hooks/useShortcut"
import { Router, useRouterState } from "./services/Router"

const root = createRoot(document.body)
root.render(<Root />)

const router = new Router()

function Root() {
	const routerState = useRouterState(router)
	const route = parseRoute(routerState.url)

	const { params } = route

	const currentPage = params.page || Object.keys(demos)[0]
	const setCurrentPage = (page: string | undefined) =>
		router.navigate(formatRoute({ params: page ? { page } : {} }))

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

	useWindowShortcuts({
		"cmd-p": () => input.current?.focus(),
	})

	const filteredItems = useFuzzyMatch({
		items: pageNames,
		filter: searchText,
	})

	const onSubmit = (value: string) => {
		setCurrentPage(value)
		setSearchText("")
	}

	const [selectedIndex, setSelectedIndex] = useClampedState(0, [0, filteredItems.length - 1])

	const { onKeyDown } = useInputAutocomplete({
		selectedIndex,
		setSelectedIndex,
		items: filteredItems,
		onSubmit: ({ value }) => onSubmit(value),
	})

	// Toggle sidebar.
	const [isOpen, setIsOpen] = useState(true)
	useWindowShortcuts({
		"cmd-\\": () => setIsOpen(!isOpen),
	})

	const keyboardMode = useKeyboardMode()

	return (
		<LeftPanelLayout show={isOpen} className="layer">
			<Input
				ref={input}
				type="search"
				style={{ width: "calc(100% - 16px)", margin: 8 }}
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
							onMouseEnter={() => {
								if (!keyboardMode) setSelectedIndex(i)
							}}
							style={{
								padding: 8,
								backgroundColor: selectedIndex === i ? "var(--accent0)" : undefined,
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
		selected: [currentPage],
		setSelected: (pages) => setCurrentPage(pages[0]),
	})

	return (
		<ListBox onClick={onClick} onKeyDown={onKeyDown}>
			{pageNames.map((pageName) => (
				<ListItem
					key={pageName}
					item={pageName}
					selected={pageName === props.currentPage}
					style={{ padding: 8 }}
					className="feedback"
				>
					{pageName}
				</ListItem>
			))}
		</ListBox>
	)
}
