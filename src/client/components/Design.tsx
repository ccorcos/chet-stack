import { clamp } from "lodash-es"
import React, { Suspense, useCallback, useRef, useState } from "react"
import { formatRoute } from "shared/routeHelpers"
import { FuzzyString } from "ui/components/FuzzyString"
import { Input } from "ui/components/Input"
import { ContentLayout, Layout, LeftPanelLayout } from "ui/components/Layout"
import { ListBox, ListItem, useListBox } from "ui/components/ListBox"
import { MenuItem } from "ui/components/MenuItem"
import * as uiDemos from "ui/demos"
import { useCounter } from "ui/hooks/useCounter"
import { useFuzzyMatch } from "ui/hooks/useFuzzyMatch"
import { useInputAutocomplete } from "ui/hooks/useInputAutocomplete"
import { useKeyboardMode } from "ui/hooks/useKeyboardMode"
import { useRefCurrent } from "ui/hooks/useRefCurrent"
import { useWindowShortcuts } from "ui/hooks/useShortcut"
import * as clientDemos from "../demos"
import { useCommand } from "../hooks/useCommand"
import { useClientEnvironment } from "../services/ClientEnvironment"

const demos = { ...uiDemos, ...clientDemos }

export function Design(props: { params: Record<string, string> }) {
	const { router } = useClientEnvironment()
	const { params } = props

	const currentPage = params.page || Object.keys(demos)[0]
	const setCurrentPage = (page: string | undefined) =>
		router.navigate(formatRoute({ path: "/design", params: page ? { page } : {} }))

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

function useClampedState(initialValue: number, range: [number, number]) {
	const [_, rerender] = useCounter()

	// Clamp the value lazily so that we preserve the position if it becomes in range again
	// and we haven't altered the state.
	const anchorRef = useRef<number>(initialValue)
	const rangeRef = useRefCurrent(range)

	// Create a clamped setState function that ensures values stay within the specified range
	const setState = useCallback((value: React.SetStateAction<number>) => {
		const prevState = clamp(anchorRef.current, ...range)
		const newValue = typeof value === "function" ? value(prevState) : value
		anchorRef.current = clamp(newValue, ...rangeRef.current)
		rerender()
	}, [])

	return [clamp(anchorRef.current, ...range), setState] as [
		number,
		React.Dispatch<React.SetStateAction<number>>,
	]
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

	const [isOpen, setIsOpen] = useState(true)
	useCommand({
		name: "Toggle Sidebar",
		shortcut: "cmd-\\",
		execute: () => setIsOpen(!isOpen),
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
