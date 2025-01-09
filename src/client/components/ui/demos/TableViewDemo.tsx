import React, {
	startTransition,
	useDeferredValue,
	useMemo,
	useRef,
	useState,
	useTransition,
} from "react"
import { incStr } from "../../../../shared/incStr"
import { randomId } from "../../../../shared/randomId"
import { useAction } from "../../../hooks/useAction"
import { useCounter } from "../../../hooks/useCounter"
import { useInfiniteLoader } from "../../../hooks/useInfiniteLoader"
import { useLoader } from "../../../hooks/useLoader"
import { usePref } from "../../../hooks/usePref"
import { useClientEnvironment } from "../../../services/ClientEnvironment"
import { NakedButton } from "../Button"
import { ComboBoxSelect } from "../ComboBox"
import { NakedInput } from "../Input"
import { HeaderCell, Table } from "../Table"

type Property =
	| { id: string; name?: string; type: "string" }
	| { id: string; name?: string; type: "number" }
	| { id: string; name?: string; type: "boolean" }
	| { id: string; name?: string; type: "select"; options?: string[] }

type PropertyType = Property["type"]

type Schema = {
	id: `schema:${string}`
	name: string
	properties: Property[]
}

type TableView = {
	id: `view:${string}`
	name: string
	schemaId: `schema:${string}`
	columns: { propertyId: string; width?: number }[]
	// filter, sort
}

type Record = {
	id: `record:${string}`
	// schemaId: `schema:${string}`
	properties: {
		[propertyId: string]: string | number | boolean | undefined
	}
}

const PlantSchema: Schema = {
	id: "schema:plants",
	name: "Plants",
	properties: [
		// { id: "id", type: "string" },
		{ id: "name", name: "Name", type: "string" },
		{ id: "height", name: "Height (m)", type: "number" },
		{ id: "nitrogen", name: "Nitrogen Fixing", type: "boolean" },
		{
			id: "layer",
			name: "Forest Layer",
			type: "select",
			options: ["Canopy", "Understory", "Shrub", "Herb", "Ground Cover", "Climbing", "Aquatic"],
		},
	],
}

const PlantView: TableView = {
	id: "view:plants",
	name: "Plants",
	schemaId: "schema:plants",
	columns: [
		{ propertyId: "name" },
		{ propertyId: "height" },
		{ propertyId: "nitrogen" },
		{ propertyId: "layer" },
	],
}

const subspace = "TableViewDemo:"

export function TableViewDemo() {
	const { api } = useClientEnvironment()

	const [columnWidths, setColumnWidths] = usePref(
		"TableViewDemo:columnWidths",
		PlantSchema.properties.map(() => 200)
	)

	const gap = 12
	const minWidth = 100

	const setWidth = (index: number) => (width: number) => {
		const newWidths = [...columnWidths]
		newWidths[index] = width
		setColumnWidths(newWidths)
	}

	const [count, rerender] = useCounter()

	const newRecord = useAction("newRecord", async (record: Record) => {
		await api.write({ set: [{ key: subspace + record.id, value: JSON.stringify(record) }] })
		rerender()
	})

	const { list, scrollRef, firstRef, lastRef, staleQuery, loadingUp, loadingDown } =
		useInfiniteListQuery({
			prefix: subspace,
			renderCount: count,
		})

	const labelRow = (children: React.ReactNode) => {
		return PlantSchema.properties.map((props, i) => <div key={i}>{i === 0 ? children : ""}</div>)
	}

	return (
		<Table
			ref={scrollRef}
			gap={12}
			columnWidths={columnWidths}
			setColumnWidths={setColumnWidths}
			style={{ padding: 12 }}
		>
			{PlantSchema.properties.map((prop, index) => {
				return (
					<HeaderCell
						key={prop.id}
						gap={gap}
						width={columnWidths[index]}
						minWidth={minWidth}
						setWidth={setWidth(index)}
						style={{
							display: "flex",
							alignItems: "center",
							gap: 4,
							border: "1px solid black",
							borderRadius: 3,
							padding: "2px 8px",
						}}
					>
						{prop.name}
						<PropertyTypeIcon type={prop.type} style={{ flex: 1, textAlign: "right" }} />
					</HeaderCell>
				)
			})}

			<>{labelRow(loadingUp ? "Loading..." : "")}</>
			<>{labelRow(list.length === 0 ? "No records." : "")}</>

			{list.map(({ key, value }, i) => (
				<React.Fragment key={key}>
					{PlantSchema.properties.map((prop, j) => {
						const record = JSON.parse(value)
						return (
							<div
								key={record.id + prop.id}
								ref={
									i === 0 && j === 0
										? firstRef
										: i === list.length - 1 && j === 0
										? lastRef
										: undefined
								}
							>
								<PropertyValue obj={record} property={prop} />
							</div>
						)
					})}
				</React.Fragment>
			))}
			<>{labelRow(loadingDown ? "Loading..." : "")}</>

			<>
				{PlantSchema.properties.map((props, i) => {
					if (i !== 0) return <div key={i} style={{ position: "sticky", bottom: 0 }}></div>
					return (
						<NakedButton
							key={i}
							style={{ position: "sticky", bottom: 0 }}
							onClick={() =>
								startTransition(() => newRecord({ id: `record:${randomId()}`, properties: {} }))
							}
						>
							New Record
						</NakedButton>
					)
				})}
			</>
		</Table>
	)
}

function PropertyTypeIcon(props: { type: PropertyType } & React.HTMLAttributes<HTMLDivElement>) {
	const { type, ...rest } = props

	if (type === "string") return <div {...rest}>"</div>
	if (type === "number") return <div {...rest}>#</div>
	if (type === "boolean") return <div {...rest}>✓</div>
	if (type === "select") return <div {...rest}>⏷</div>

	return <div {...rest}>?</div>
}

function PropertyValue(props: { obj: Record; property: Property }) {
	const { obj, property } = props

	const update = (value: any) => {
		// db.commit({
		// 	set: [{ key: [obj.id], value: { ...obj, [property.id]: value } }],
		// })
	}

	let value = obj[property.id]

	if (property.type === "string") {
		if (value === undefined) value = ""
		value = value.toString()
		return (
			<NakedInput
				value={value}
				onChange={(e) => update(e.target.value)}
				style={{ width: "100%" }}
			/>
		)
	}

	if (property.type === "number") {
		if (typeof value === "string") value = parseFloat(value)
		if (typeof value === "boolean") value = value === true ? 1 : 0
		if (value === undefined || isNaN(value)) value = ""
		return (
			<NakedInput
				type="number"
				value={value}
				onChange={(e) => update(e.target.value)}
				style={{ width: "100%" }}
			/>
		)
	}

	if (property.type === "boolean") {
		if (value === undefined || value === "") value = false
		if (typeof value === "string") value = true
		if (typeof value === "number") value = value > 0
		return <NakedInput type="checkbox" checked={value} onChange={(e) => update(e.target.checked)} />
	}

	if (property.type === "select") {
		const options = property.options || []
		if (!options.includes(value as any)) value = undefined

		return (
			<ComboBoxSelect
				items={property.options || []}
				placeholder="Select"
				value={value as any}
				onChange={update}
				Button={NakedButton}
			/>
		)
	}

	return <>?</>
}

// TODO:
// - combobox with naked input.

// - delete / duplicate rows
// - edit the schema
// - edit the schema
// - row selection
// - selection and moving
// - edit the schema

const defaultLimit = 50

function useInfiniteListQuery(args: { prefix: string; renderCount: number }) {
	const { api } = useClientEnvironment()

	const { prefix, renderCount: count } = args

	const [cursor, setCursor] = useState<{ anchor: string; limit: number; reverse: boolean }>({
		anchor: prefix,
		limit: defaultLimit,
		reverse: false,
	})

	const query = useMemo(() => ({ prefix, count, ...cursor }), [prefix, count, cursor])
	const deferredQuery = useDeferredValue(query)
	const staleQuery = deferredQuery !== query

	// We use the deferred query so we can render the old list while the new one loads.
	const loader = useLoader("list:" + JSON.stringify(deferredQuery), async () => {
		const response = await api.list(
			deferredQuery.reverse
				? {
						gte: deferredQuery.prefix,
						lte: deferredQuery.anchor,
						limit: deferredQuery.limit,
						reverse: true,
				  }
				: {
						gte: deferredQuery.anchor,
						lt: incStr(deferredQuery.prefix),
						limit: deferredQuery.limit,
				  }
		)

		if (response.status !== 200) throw new Error("Request failed: " + response.status)
		if (query.reverse) return [...response.body].reverse()
		return response.body
	})

	const list = loader.suspend()
	const deferredListCount = useDeferredValue(list.length)

	const scrollRef = useRef<HTMLDivElement>(null)
	const firstRef = useRef<HTMLDivElement>(null)
	const lastRef = useRef<HTMLDivElement>(null)
	const [loadingUp, startTransitionUp] = useTransition()
	const [loadingDown, startTransitionDown] = useTransition()

	useInfiniteLoader({
		scrollRef,
		firstRef,
		lastRef,
		query: deferredQuery,
		resultCount: deferredListCount,
		loadingUp,
		loadingDown,
		onLoadMore: (limit, dir) => {
			const startTransition =
				dir === "up" || query.reverse ? startTransitionUp : startTransitionDown
			startTransition(() => {
				if (dir === "up") {
					const { key } = list[Math.ceil(list.length / 3)]
					setCursor({ anchor: key, limit, reverse: true })
				} else if (dir === "down") {
					const { key } = list[Math.ceil((list.length * 2) / 3)]
					setCursor({ anchor: key, limit, reverse: false })
				} else {
					setCursor((cursor) => ({ ...cursor, limit }))
				}
			})
		},
	})

	return { list, scrollRef, firstRef, lastRef, staleQuery, loadingUp, loadingDown }
}

// export function OKVDatabaseDemo(props: { params: Record<string, string> }) {
// 	const { router, api } = useClientEnvironment()

// 	const prefix = props.params.prefix || ""
// 	const setPrefix = (prefix: string) => {
// 		const url = setParam(router.state.url, "prefix", prefix === "" ? undefined : prefix)
// 		router.replace(url)
// 		setCursor(({ limit }) => ({ anchor: prefix, limit, reverse: false }))
// 	}

// 	const [columnWidths, setColumnWidths] = usePref("RawDatabase2Demo:columnWidths2", [300, 300])

// 	const setWidth = (index: number) => (width: number) => {
// 		const newWidths = [...columnWidths]
// 		newWidths[index] = width
// 		setColumnWidths(newWidths)
// 	}

// 	const backgroundColor = loadingUp
// 		? "var(--red)"
// 		: loadingDown
// 		? "var(--green)"
// 		: staleQuery
// 		? "var(--blue)"
// 		: "var(--background)"
// }
