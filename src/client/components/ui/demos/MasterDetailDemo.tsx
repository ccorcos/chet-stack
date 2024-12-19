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
import { useOKV } from "../../../hooks/useOKV"
import { useOKVList } from "../../../hooks/useOKVList"
import { isShortcut } from "../../../hooks/useShortcut"
import {
	ClientEnvironmentProvider,
	useClientEnvironment,
} from "../../../services/ClientEnvironment"
import { Button } from "../Button"
import { Input } from "../Input"
import { ContentLayout, Layout, LeftPanelLayout } from "../Layout"
import { ListBoxKeyed, ListItem } from "../ListBox"

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

function OKVSelectedDetails(props: { selected: string }) {
	const deferredSelected = useDeferredValue(props.selected)
	const stale = deferredSelected !== props.selected
	const value = useOKV(deferredSelected)
	return <div style={{ color: stale ? "var(--text-color2)" : "inherit" }}>{value}</div>
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

	const { list, pendingUp, pendingDown, staleQuery, scrollRef, firstRef, lastRef } = useOKVList({
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
					{pendingUp && <div>Loading...</div>}
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
					{pendingDown && <div>Loading...</div>}
				</Suspense>
			</div>
			<Button onClick={() => startTransition(() => onNewRecord(randomId()))}>New Record</Button>
		</div>
	)
}
