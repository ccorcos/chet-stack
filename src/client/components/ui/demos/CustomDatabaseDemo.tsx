import React, { Suspense, useDeferredValue, useTransition } from "react"
import { incStr } from "../../../../shared/incStr"
import { randomId } from "../../../../shared/randomId"
import { setParam } from "../../../../shared/routeHelpers"
import { useAction } from "../../../hooks/useAction"
import { useDeferredCounter } from "../../../hooks/useCounter"
import { useLoader } from "../../../hooks/useLoader"
import { useClientEnvironment } from "../../../services/ClientEnvironment"
import { Button } from "../Button"
import { ContentEditableInput } from "../ContentEditableInput"
import { ContentLayout, Layout, LeftPanelLayout } from "../Layout"
import { ListBox, ListItem, useListBox } from "../ListBox"

export function CustomDatabaseDemo(props: { params: Record<string, string | undefined> }) {
	const selected = props.params.schema

	return (
		<Layout LeftPanel={<SchemaListPanel selected={selected} />}>
			<SchemaDetails selected={selected} />
		</Layout>
	)
}

function SchemaListPanel(props: { selected: string | undefined }) {
	const { api, router } = useClientEnvironment()

	const [count, stale, rerender] = useDeferredCounter()
	const [pending, startTransition] = useTransition()

	const onNewSchema = useAction("newSchema", async (key: string) => {
		await api.write({ set: [{ key, value: "hello" }] })
		router.replace(setParam(router.state.url, "schema", key))
		rerender()
	})

	const onSelectKey = (key: string | undefined) => {
		router.replace(setParam(router.state.url, "schema", key))
	}

	// TODO: eventually useInfiniteLoader

	const loading = pending || stale

	return (
		<LeftPanelLayout show={true} style={{ padding: 12 }}>
			<div style={{ display: "flex", flexDirection: "column", maxHeight: "100%", gap: 8 }}>
				<div>Schemas</div>
				<Suspense fallback={<div>Loading...</div>}>
					<div style={{ flexGrow: 1, minHeight: 0, overflowY: "auto" }}>
						<SchemaList
							renderCount={count}
							stale={loading}
							selected={props.selected}
							onSelectKey={onSelectKey}
						/>
					</div>
					<Button
						onClick={() => {
							startTransition(() => onNewSchema(`schema:${randomId()}`))
						}}
					>
						New Schema
					</Button>
				</Suspense>
			</div>
		</LeftPanelLayout>
	)
}

function SchemaList(props: {
	renderCount: number
	stale: boolean
	selected: string | undefined
	onSelectKey: (key: string | undefined) => void
}) {
	const { api } = useClientEnvironment()

	const loader = useLoader(["schemas", props.renderCount], async () => {
		const response = await api.list({
			gt: "schema:",
			lt: incStr("schema:"),
		})

		if (response.status !== 200) throw new Error("Request failed: " + response.status)
		return response.body
	})

	const schemas = loader.suspend()

	const selected = props.selected
	const setSelected = props.onSelectKey

	const keys = schemas.map(({ key }) => key)
	const { onClick, onKeyDown } = useListBox({ list: keys, selected, setSelected: setSelected })

	return (
		<ListBox
			onClick={onClick}
			onKeyDown={onKeyDown}
			style={{ color: props.stale ? "var(--text-color2)" : "inherit" }}
		>
			{keys.map((key) => (
				<ListItem key={key} item={key} selected={selected === key}>
					{key}
				</ListItem>
			))}
		</ListBox>
	)
}

function SchemaDetails(props: { selected: string | undefined }) {
	const selected = useDeferredValue(props.selected)
	const stale = selected !== props.selected

	return (
		<ContentLayout>
			<Suspense fallback={<div>Loading...</div>}>
				{selected ? (
					<SchemaEditor key={selected} selected={selected} stale={stale} />
				) : (
					<div>No schema selected</div>
				)}
			</Suspense>
		</ContentLayout>
	)
}

function SchemaEditor(props: { selected: string; stale: boolean }) {
	const { api } = useClientEnvironment()

	const { selected } = props
	const [count, stale, rerender] = useDeferredCounter()
	const [pending, startTransition] = useTransition()

	const loader = useLoader(["schema", selected, count], async () => {
		const response = await api.get(selected)
		if (response.status !== 200) throw new Error("Request failed: " + response.status)
		return response.body
	})
	const onSubmit = useAction("submitSchema", async (key: string, value: string) => {
		await api.write({ set: [{ key, value }] })
		rerender()
	})

	const schema = loader.suspend()
	if (!schema) return <div>No schema found</div>

	const loading = props.stale || pending || stale

	return (
		<>
			{!schema && <div style={{ color: "var(--red)" }}>No schema found</div>}
			<ContentEditableInput
				style={{ color: loading ? "var(--text-color2)" : "inherit" }}
				value={schema || ""}
				onSubmit={async (value) => {
					startTransition(() => {
						onSubmit(props.selected, value)
					})
				}}
			/>
		</>
	)
}
