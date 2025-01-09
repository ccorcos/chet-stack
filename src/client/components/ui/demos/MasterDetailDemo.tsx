import React, { Suspense, useDeferredValue, useMemo, useTransition } from "react"
import {
	KeyDecodeListResults,
	KeyEncodeListArgs,
	KeyEncodeWrite,
	SubspaceEncoder,
} from "../../../../shared/database/DatabaseEncoder"
import { proxyObj } from "../../../../shared/proxyHelpers"
import { randomId } from "../../../../shared/randomId"
import { setParam } from "../../../../shared/routeHelpers"
import { useAction } from "../../../hooks/useAction"
import { useDeferredCounter } from "../../../hooks/useCounter"
import { useRemoteGet } from "../../../hooks/useRemoteGet"
import { useRemoteList } from "../../../hooks/useRemoteList"
import { isShortcut } from "../../../hooks/useShortcut"
import {
	ClientEnvironmentProvider,
	useClientEnvironment,
} from "../../../services/ClientEnvironment"
import { Button } from "../Button"
import { Input } from "../Input"
import { ContentLayout, Layout, LeftPanelLayout } from "../Layout"
import { ListBoxKeyed, ListItem } from "../ListBox"
import { TextInput } from "../TextInput"

function Subspace(props: { subspace: string; children: React.ReactNode }) {
	const environment = useClientEnvironment()

	const { api } = environment

	const newEnvironment = useMemo(() => {
		const encoder = SubspaceEncoder(props.subspace)

		const newApi = proxyObj(async (key, args) => {
			if (key === "list") {
				const response = await api.list(KeyEncodeListArgs(args, encoder))
				if (response.status === 200) {
					return {
						...response,
						body: KeyDecodeListResults(response.body, encoder),
					}
				}

				return response
			}
			if (key === "write") {
				return api.write(KeyEncodeWrite(args, encoder))
			}
			if (key === "get") {
				return api.get(encoder.encode(args))
			}

			return api[key](args)
		})

		return { ...environment, api: newApi }
	}, [props.subspace])

	return (
		<ClientEnvironmentProvider value={newEnvironment}>{props.children}</ClientEnvironmentProvider>
	)
}

export function MasterDetailDemo(props: { params: Record<string, string | undefined> }) {
	const selected = props.params.selected
	return (
		<Subspace subspace={"docs"}>
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
	const deferredSelected = useDeferredValue(props.selected)
	const stale = deferredSelected !== props.selected
	const value = useRemoteGet(deferredSelected)

	const { api, router } = useClientEnvironment()

	const onUpdate = useAction("update", async (value: string) => {
		const key = deferredSelected
		let { title, body, properties } = parseText(value)
		if (!title) title = key

		const content = [title, body].join("\n\n")
		if (title === key) {
			await api.write({ set: [{ key, value: content }] })
		} else {
			await api.write({ set: [{ key: title, value: content }], delete: [key] })
			router.replace(setParam(router.state.url, "selected", title))
		}
	})

	const [updatePending, startTransition] = useTransition()

	if (!value) return <div>Loading...</div>

	const properties = useMemo(() => {
		const { title, body, properties } = parseText(value)
		return Object.entries(properties).map(([key, value]) => {
			return (
				<div key={key}>
					{key}: {Array.isArray(value) ? value.join(", ") : value}
				</div>
			)
		})
	}, [value])

	return (
		<>
			<div>{properties}</div>
			<TextInput
				key={deferredSelected}
				multiline={true}
				style={{ color: stale || updatePending ? "var(--text-color2)" : "inherit" }}
				value={value}
				onSubmit={(value) => {
					startTransition(() => onUpdate(value))
				}}
			/>
		</>
	)
}

function OKVList(props: { params: Record<string, string | undefined> }) {
	const { router } = useClientEnvironment()

	const prefix = props.params.prefix || ""
	const deferredPrefix = useDeferredValue(prefix)
	const stalePrefix = deferredPrefix !== prefix

	const setPrefix = (prefix: string) => {
		router.replace(setParam(router.state.url, "prefix", prefix))
	}

	const selected = props.params.selected
	const setSelected = (selected: string | undefined) => {
		router.replace(setParam(router.state.url, "selected", selected))
	}

	const [count, refetching, rerender] = useDeferredCounter()

	const { list, loadingUp, loadingDown, staleQuery, scrollRef, firstRef, lastRef } = useRemoteList({
		prefix: deferredPrefix,
		renderCount: count,
	})

	const [newRecordPending, startTransition] = useTransition()

	const { api } = useClientEnvironment()
	const onNewRecord = useAction("newRecord", async (key: string) => {
		await api.write({ set: [{ key, value: `${key}\n\n` }] })
		setSelected(key)
		rerender()
	})

	const onDeleteRecord = useAction("deleteRecord", async (key: string) => {
		await api.write({ delete: [key] })
		setSelected(undefined)
		rerender()
	})

	const loading = newRecordPending || staleQuery || stalePrefix

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
										startTransition(() => onDeleteRecord(item.key))
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
			<Button onClick={() => startTransition(() => onNewRecord(randomId()))}>New Record</Button>
		</div>
	)
}
