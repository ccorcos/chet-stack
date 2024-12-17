import React, { Suspense, useMemo, useRef, useState, useTransition } from "react"
import { sleep } from "../../../../shared/sleep"
import { useInfiniteLoader } from "../../../hooks/useInfiniteLoader"
import { useLoader } from "../../../hooks/useLoader"
import { Input } from "../Input"

// TODO:
// - resizable table component entirely separate.
// - put it all together in the OKV demo
// - think about selection and the other GridDemo stuff we did.

export function InfiniteLoaderDemo(props: { params: Record<string, string> }) {
	const [cursor, setCursor] = useState<{ anchor: number; limit: number; reverse: boolean }>({
		anchor: 0,
		limit: 100,
		reverse: false,
	})

	const [maxN, setMaxN] = useState(1000000)
	const [delayMs, setDelayMs] = useState(1000)

	const [loading, startTransition] = useTransition()
	const query = useMemo(() => ({ maxN, ...cursor }), [maxN, cursor])

	const loader = useLoader("numberlist:" + JSON.stringify(query), async () => {
		await sleep(delayMs)
		const list: number[] = []
		if (query.reverse) {
			for (let i = query.anchor; i >= Math.max(query.anchor - query.limit, 0); i--) list.push(i)
			list.reverse()
		} else {
			for (let i = query.anchor; i < Math.min(query.anchor + query.limit, query.maxN); i++)
				list.push(i)
		}
		return list
	})

	const list = loader.suspend()

	const scrollRef = useRef<HTMLDivElement>(null)
	const firstRef = useRef<HTMLDivElement>(null)
	const lastRef = useRef<HTMLDivElement>(null)

	const { pendingUp, pendingDown } = useInfiniteLoader({
		scrollRef,
		firstRef,
		lastRef,
		query,
		resultCount: list.length,
		onLoadMore: (limit, dir) => {
			if (dir === "up") {
				const anchor = list[Math.ceil(list.length / 3)]
				setCursor({ anchor, limit, reverse: true })
			} else if (dir === "down") {
				const anchor = list[Math.ceil((list.length * 2) / 3)]
				setCursor({ anchor, limit, reverse: false })
			} else {
				setCursor((cursor) => ({ ...cursor, limit }))
			}
		},
	})

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
				padding: 12,
			}}
		>
			{/* <Input placeholder="Prefix" value={prefix} onChange={(e) => setPrefix(e.target.value)} /> */}
			<div style={{ display: "flex", gap: 8 }}>
				<div>Max N:</div>
				<Input
					type="number"
					min="10"
					max="100000"
					defaultValue={maxN}
					onKeyDown={(e) => {
						if (e.key === "Enter") e.currentTarget.blur()
					}}
					onBlur={(e) => startTransition(() => setMaxN(parseInt(e.target.value)))}
					style={{ width: 120, textAlign: "right" }}
				/>
			</div>
			<div style={{ display: "flex", gap: 8 }}>
				<div>Delay (ms):</div>
				<Input
					type="number"
					min="0"
					max="2000"
					defaultValue={delayMs}
					onKeyDown={(e) => {
						if (e.key === "Enter") e.currentTarget.blur()
					}}
					onBlur={(e) => startTransition(() => setDelayMs(parseInt(e.target.value)))}
					style={{ width: 80, textAlign: "right" }}
				/>
			</div>

			<Suspense fallback={<div>Loading...</div>}>
				<div
					ref={scrollRef}
					style={{
						overflowY: "auto",
						// Overflow grid with relative for stick headers.
						flex: 1,
						position: "relative",
						color: loading || pendingUp || pendingDown ? "var(--gray)" : "var(--text-color)",
					}}
				>
					<>
						<div key="up">{pendingUp ? "Loading..." : ""}</div>
						<div key="up2" />
					</>

					{list.map((n, index) => (
						<div
							key={n}
							ref={index === 0 ? firstRef : index === list.length - 1 ? lastRef : undefined}
						>
							{n}
						</div>
					))}
					<>
						<div key="down">{pendingDown ? "Loading..." : ""}</div>
						<div key="down2" />
					</>
				</div>
			</Suspense>
		</div>
	)
}
