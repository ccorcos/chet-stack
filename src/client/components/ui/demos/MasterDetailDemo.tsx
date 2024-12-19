import React, { Suspense, useDeferredValue, useMemo } from "react"
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
					<OKVDetails selected={selected} />
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
	const setSelected = (selected: string) => {
		router.replace(setParam(router.state.url, "selected", selected))
	}

	const [count, refetching, rerender] = useDeferredCounter()

	const { list, pendingUp, pendingDown, staleQuery, scrollRef, firstRef, lastRef } = useOKVList({
		prefix: deferredPrefix,
		renderCount: count,
	})

	const { api } = useClientEnvironment()
	const onNewRecord = useAction("newRecord", async (key: string) => {
		await api.write({ set: [{ key, value: "hello" }] })
		setSelected(key)
		rerender()
	})

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
						style={{ color: staleQuery || stalePrefix ? "var(--text-color2)" : "inherit" }}
					>
						{(item, props, i) => (
							<ListItem
								ref={i === 0 ? firstRef : i === list.length - 1 ? lastRef : undefined}
								{...props}
							>
								{item.key}
							</ListItem>
						)}
					</ListBoxKeyed>
					{pendingDown && <div>Loading...</div>}
				</Suspense>
			</div>
			<Button onClick={() => onNewRecord(randomId())}>New Record</Button>
		</div>
	)
}
