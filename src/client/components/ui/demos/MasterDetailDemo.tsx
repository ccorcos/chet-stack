import React, { Suspense, useMemo } from "react"
import { incStr } from "../../../../shared/incStr"
import { randomId } from "../../../../shared/randomId"
import { setParam } from "../../../../shared/routeHelpers"
import { useGet, useList, useWrite } from "../../../hooks/useDatabase"
import { useInfiniteList } from "../../../hooks/useInfiniteList"
import { isShortcut } from "../../../hooks/useShortcut"
import { useClientEnvironment } from "../../../services/ClientEnvironment"
import { Subspace } from "../../Subspace"
import { Button } from "../Button"
import { Input } from "../Input"
import { ContentLayout, Layout, LeftPanelLayout } from "../Layout"
import { ListBoxKeyed, ListItem } from "../ListBox"
import { TextInput } from "../TextInput"

export function MasterDetailDemo(props: { params: Record<string, string | undefined> }) {
	const selected = props.params.selected
	return (
		<Subspace prefix={"docs"}>
			<Layout
				LeftPanel={
					<LeftPanelLayout show={true} style={{ padding: 12 }}>
						<OKVList {...props} />
					</LeftPanelLayout>
				}
			>
				<ContentLayout style={{ padding: 12 }}>
					<Suspense fallback={<div>Loading...</div>}>
						<OKVDetails selected={selected} />
					</Suspense>
				</ContentLayout>
			</Layout>
		</Subspace>
	)
}

function OKVDetails(props: { selected: string | undefined }) {
	if (!props.selected) return <div>No selection.</div>
	return <OKVSelectedDetails selected={props.selected} />
}

function parseText(text: string) {
	const lines = text.split("\n")
	if (lines.length === 0) return { title: "", body: "", properties: {} }

	const title = lines[0].trim()
	const body = lines.slice(1).join("\n").trim()

	const properties: Record<string, string | number | (string | number)[]> = {}

	for (const line of body.split("\n")) {
		const match = line.match(/^([^:]+):\s*(.+)$/)
		if (!match) continue

		const [_, label, value] = match
		const trimmedLabel = label.trim()
		const trimmedValue = value.trim()

		// Parse value
		let parsedValue: string | number | (string | number)[]

		// Check if comma-separated
		if (trimmedValue.includes(",")) {
			parsedValue = trimmedValue.split(",").map((v) => {
				const num = Number(v.trim())
				return isNaN(num) ? v.trim() : num
			})
		} else {
			const num = Number(trimmedValue)
			parsedValue = isNaN(num) ? trimmedValue : num
		}

		// Add to properties
		if (trimmedLabel in properties) {
			const existing = properties[trimmedLabel]
			if (Array.isArray(existing)) {
				// @ts-ignore
				existing.push(parsedValue)
			} else {
				// @ts-ignore
				properties[trimmedLabel] = [existing, parsedValue]
			}
		} else {
			properties[trimmedLabel] = parsedValue
		}
	}

	return { title, body, properties }
}

function OKVSelectedDetails(props: { selected: string }) {
	const { router } = useClientEnvironment()
	const key = props.selected

	const write = useWrite()

	const onUpdate = (value: string) => {
		let { title, body, properties } = parseText(value)
		if (!title) title = key

		const content = [title, body].join("\n\n")
		if (title === key) {
			write({ set: [{ key, value: content }] })
		} else {
			write({ set: [{ key: title, value: content }], delete: [key] })
			router.replace(setParam(router.state.url, "selected", title))
		}
	}

	const value = useGet(key)
	const text = value.localResult.hit

	const properties = useMemo(() => {
		const { title, body, properties } = parseText(text || "")
		return Object.entries(properties).map(([key, value]) => {
			return (
				<div key={key}>
					{key}: {Array.isArray(value) ? value.join(", ") : value}
				</div>
			)
		})
	}, [text])

	if (text === undefined) return <div>Loading...</div>

	return (
		<>
			<div>{properties}</div>
			<TextInput
				key={key}
				multiline={true}
				// style={{ color:  ? "var(--text-color2)" : "inherit" }}
				value={text}
				onSubmit={(value) => {
					onUpdate(value)
				}}
			/>
		</>
	)
}

function useListQuery(query: { prefix: string; anchor: string; limit: number; reverse: boolean }) {
	return useList(
		query.reverse
			? { gte: query.prefix, lte: query.anchor, limit: query.limit, reverse: true }
			: { gte: query.anchor, lt: incStr(query.prefix), limit: query.limit }
	)
}

function OKVList(props: { params: Record<string, string | undefined> }) {
	const { router } = useClientEnvironment()

	const selected = props.params.selected
	const setSelected = (selected: string | undefined) => {
		router.replace(setParam(router.state.url, "selected", selected))
	}

	const prefix = props.params.prefix || ""
	const setPrefix = (prefix: string) => {
		const url = setParam(router.state.url, "prefix", prefix === "" ? undefined : prefix)
		router.replace(url)
	}

	const { list, loading, loadingUp, loadingDown, scrollRef, firstRef, lastRef } = useInfiniteList({
		prefix,
	})

	const write = useWrite()

	const onNewRecord = (key: string) => {
		write({ set: [{ key, value: `${key}\n\n` }] })
		setSelected(key)
	}

	const onDeleteRecord = (key: string) => {
		write({ delete: [key] })
		setSelected(undefined)
	}

	return (
		<div style={{ display: "flex", flexDirection: "column", maxHeight: "100%", gap: 8 }}>
			<Input placeholder="Search" value={prefix} onChange={(e) => setPrefix(e.target.value)} />
			<div ref={scrollRef} style={{ flexGrow: 1, minHeight: 0, overflowY: "auto" }}>
				<Suspense fallback={<div>Loading...</div>}>
					{loadingUp && <div>Loading...</div>}
					<ListBoxKeyed
						items={list}
						getKey={({ key }) => key}
						selectedKey={selected}
						onSelectKey={setSelected}
						autoFocus={true}
						style={{ color: loading ? "var(--text-color2)" : "inherit" }}
					>
						{(item, props, i) => (
							<ListItem
								ref={i === 0 ? firstRef : i === list.length - 1 ? lastRef : undefined}
								{...props}
								onKeyDown={(e) => {
									props.onKeyDown(e)
									if (isShortcut("delete", e.nativeEvent)) {
										onDeleteRecord(item.key)
									}
								}}
							>
								{item.key}
							</ListItem>
						)}
					</ListBoxKeyed>
					{loadingDown && <div>Loading...</div>}
				</Suspense>
			</div>
			<Button onClick={() => onNewRecord(randomId())}>New Record</Button>
		</div>
	)
}
