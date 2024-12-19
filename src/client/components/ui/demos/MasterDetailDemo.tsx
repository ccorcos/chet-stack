import React, { Suspense, useDeferredValue, useMemo, useTransition } from "react"
import {
	KeyDecodeListResults,
	KeyEncodeListArgs,
	KeyEncodeWrite,
	SubspaceEncoder,
} from "../../../../shared/database/DatabaseEncoder"
import { incStr } from "../../../../shared/incStr"
import { randomId } from "../../../../shared/randomId"
import { setParam } from "../../../../shared/routeHelpers"
import { useAction } from "../../../hooks/useAction"
import { useDeferredCounter } from "../../../hooks/useCounter"
import { useLoader } from "../../../hooks/useLoader"
import {
	ClientEnvironmentProvider,
	useClientEnvironment,
} from "../../../services/ClientEnvironment"
import { ClientApi } from "../../../services/api"
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
		const newApi: ClientApi = {
			...api,
			list: async (args) => {
				const response = await api.list(KeyEncodeListArgs(args, encoder))
				if (response.status === 200) {
					return {
						...response,
						body: KeyDecodeListResults(response.body, encoder),
					}
				}
				return response
			},
			write: (args) => {
				return api.write(KeyEncodeWrite(args, encoder))
			},
		}
		return { ...environment, api: newApi }
	}, [props.subspace])

	return (
		<ClientEnvironmentProvider value={newEnvironment}>{props.children}</ClientEnvironmentProvider>
	)
}

export function MasterDetailDemo(props: { params: Record<string, string | undefined> }) {
	const { router } = useClientEnvironment()
	const selected = props.params.selected
	const setSelected = (selected: string | undefined) => {
		router.replace(setParam(router.state.url, "selected", selected))
	}
	const prefix = props.params.prefix
	const setPrefix = (prefix: string | undefined) => {
		router.replace(setParam(router.state.url, "prefix", prefix))
	}

	return (
		<Subspace subspace={"docs:"}>
			<Layout
				LeftPanel={
					<ListPanel
						prefix={prefix}
						setPrefix={setPrefix}
						selected={selected}
						setSelected={setSelected}
					/>
				}
			>
				<Details selected={selected} setSelected={setSelected} />
			</Layout>
		</Subspace>
	)
}

function ListPanel(props: {
	selected: string | undefined
	setSelected: (selected: string | undefined) => void
	prefix: string | undefined
	setPrefix: (prefix: string | undefined) => void
}) {
	const { api, router } = useClientEnvironment()

	const [count, stale, rerender] = useDeferredCounter()
	const [pending, startTransition] = useTransition()

	const onNewSchema = useAction("newSchema", async (key: string) => {
		await api.write({ set: [{ key, value: "hello" }] })
		router.replace(setParam(router.state.url, "schema", key))
		rerender()
	})

	const onSelectKey = (key: string) => {
		router.replace(setParam(router.state.url, "schema", key))
	}

	// TODO: eventually useInfiniteLoader

	const loading = pending || stale

	return (
		<LeftPanelLayout show={true} style={{ padding: 12 }}>
			<div style={{ display: "flex", flexDirection: "column", maxHeight: "100%", gap: 8 }}>
				<Input
					placeholder="Search"
					value={props.prefix}
					onChange={(e) => props.setPrefix(e.target.value)}
				/>

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
	onSelectKey: (key: string) => void
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

	return (
		<>
			<ListBoxKeyed
				items={schemas}
				getKey={({ key }) => key}
				selectedKey={props.selected}
				onSelectKey={props.onSelectKey}
				autoFocus={true}
				style={{ color: props.stale ? "var(--text-color2)" : "inherit" }}
			>
				{(item, props) => <ListItem {...props}>{item.key}</ListItem>}
			</ListBoxKeyed>
		</>
	)
}

function Details(props: {
	selected: string | undefined
	setSelected: (selected: string | undefined) => void
}) {
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
			<TextInput
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
