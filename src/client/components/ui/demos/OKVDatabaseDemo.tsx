import React, { Suspense } from "react"
import { incStr } from "../../../../shared/incStr"
import { setParam } from "../../../../shared/routeHelpers"
import { useList, useWrite } from "../../../hooks/useDatabase"
import { useInfiniteList } from "../../../hooks/useInfiniteList"
import { usePref } from "../../../hooks/usePref"
import { useClientEnvironment } from "../../../services/ClientEnvironment"
import { ContentEditableInput } from "../ContentEditableInput"
import { Input } from "../Input"
import { HeaderCell, Table } from "../Table"

function useListQuery(query: { prefix: string; anchor: string; limit: number; reverse: boolean }) {
	return useList(
		query.reverse
			? { gte: query.prefix, lte: query.anchor, limit: query.limit, reverse: true }
			: { gte: query.anchor, lt: incStr(query.prefix), limit: query.limit }
	)
}

const gap = 12
const minWidth = 150
const defaultLimit = 50

export function OKVDatabaseDemo(props: { params: Record<string, string> }) {
	const { router } = useClientEnvironment()
	const write = useWrite()

	const prefix = props.params.prefix || ""
	const setPrefix = (prefix: string) => {
		const url = setParam(router.state.url, "prefix", prefix === "" ? undefined : prefix)
		router.replace(url)
	}

	const { list, loading, loadingUp, loadingDown, scrollRef, firstRef, lastRef } = useInfiniteList({
		prefix,
	})

	const [columnWidths, setColumnWidths] = usePref("RawDatabase2Demo:columnWidths2", [300, 300])

	const setWidth = (index: number) => (width: number) => {
		const newWidths = [...columnWidths]
		newWidths[index] = width
		setColumnWidths(newWidths)
	}

	const backgroundColor = loadingUp
		? "red"
		: loadingDown
		? "green"
		: loading
		? "blue"
		: "var(--bg0)"

	return (
		<div
			style={{
				// 100% height of ContentLayout, reset overflow to prevent body scroll.
				height: "100%",
				width: "100%",
				overflow: "hidden",

				// Column layout.
				display: "flex",
				flexDirection: "column",
				gap,
				padding: 12,
			}}
		>
			<Input placeholder="Prefix" value={prefix} onChange={(e) => setPrefix(e.target.value)} />
			<Suspense fallback={<div>Loading...</div>}>
				<Table
					ref={scrollRef}
					gap={gap}
					columnWidths={columnWidths}
					setColumnWidths={setColumnWidths}
				>
					<HeaderCell
						width={columnWidths[0]}
						minWidth={minWidth}
						setWidth={setWidth(0)}
						style={{
							backgroundColor,
							fontWeight: "bold",
							whiteSpace: "normal",
							wordBreak: "break-all",
						}}
					>
						Key
					</HeaderCell>
					<HeaderCell
						width={columnWidths[1]}
						minWidth={minWidth}
						setWidth={setWidth(1)}
						style={{
							backgroundColor,
							fontWeight: "bold",
							whiteSpace: "normal",
							wordBreak: "break-all",
						}}
					>
						Value
					</HeaderCell>
					<>
						<div key="up">{loadingUp ? "Loading..." : ""}</div>
						<div key="up2" />
					</>
					{list.map(({ key, value }, index) => (
						<React.Fragment key={key}>
							<ContentEditableInput
								ref={index === 0 ? firstRef : index === list.length - 1 ? lastRef : undefined}
								data-key={key}
								value={key}
								onSubmit={async (newKey) => {
									write({
										set: [{ key: newKey, value }],
										delete: [key],
									})
								}}
							/>
							<ContentEditableInput
								value={value}
								onSubmit={async (newValue) => {
									write({ set: [{ key, value: newValue }] })
								}}
								style={{ whiteSpace: "pre-wrap" }}
							/>
						</React.Fragment>
					))}
					<>
						<div key="down">{loadingDown ? "Loading..." : ""}</div>
						<div key="down2" />
					</>
				</Table>
			</Suspense>
		</div>
	)
}
