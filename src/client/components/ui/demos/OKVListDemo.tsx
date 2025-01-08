import { Suspense } from "react"

import React, { useDeferredValue } from "react"
import { setParam } from "../../../../shared/routeHelpers"
import { useRemoteGet } from "../../../hooks/useRemoteGet"
import { useRemoteList } from "../../../hooks/useRemoteList"
import { useClientEnvironment } from "../../../services/ClientEnvironment"
import { Input } from "../Input"
import { ContentLayout, Layout, LeftPanelLayout } from "../Layout"
import { ListBoxKeyed, ListItem } from "../ListBox"

export function OKVListDemo(props: { params: Record<string, string | undefined> }) {
	const selected = props.params.selected

	return (
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
	)
}

function OKVDetails(props: { selected: string | undefined }) {
	if (!props.selected) return <div>No selection.</div>
	return <OKVSelectedDetails selected={props.selected} />
}

function OKVSelectedDetails(props: { selected: string }) {
	const deferredSelected = useDeferredValue(props.selected)
	const stale = deferredSelected !== props.selected
	const value = useRemoteGet(deferredSelected)
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

	const { list, pendingUp, pendingDown, staleQuery, scrollRef, firstRef, lastRef } = useRemoteList({
		prefix: deferredPrefix,
		renderCount: 0,
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
			<div>Footer</div>
		</div>
	)
}
