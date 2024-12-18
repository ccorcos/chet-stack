import React from "react"
import { passthroughRef } from "../../helpers/passthroughRef"
import { useHover } from "../../hooks/useHover"

export const Table = passthroughRef(_Table)

function _Table(props: {
	ref?: React.RefObject<HTMLDivElement>
	gap: number
	columnWidths: number[]
	setColumnWidths: (value: number[]) => void
	style?: React.CSSProperties
	children: React.ReactNode
}) {
	const { gap, columnWidths } = props

	return (
		<div
			ref={props.ref}
			style={{
				overflow: "auto",
				position: "relative",
				display: "grid",
				gridTemplateColumns: columnWidths.map((w) => `${w}px`).join(" "),
				gap: gap,
				...props.style,
			}}
		>
			{props.children}
		</div>
	)
}

export const HeaderCell = passthroughRef(_HeaderCell)

function _HeaderCell(props: {
	ref?: React.RefObject<HTMLDivElement>
	gap: number
	width: number
	minWidth: number
	setWidth: (value: number) => void
	style?: React.CSSProperties
	children: React.ReactNode
}) {
	const { gap, width, minWidth, setWidth } = props

	return (
		<div
			ref={props.ref}
			style={{
				position: "sticky",
				top: 0,
				zIndex: 1,
				width: width,
				...props.style,
			}}
		>
			{props.children}
			<Resizer gap={gap} width={width} minWidth={minWidth} setWidth={setWidth} />
		</div>
	)
}

function Resizer(props: {
	gap: number
	width: number
	minWidth: number
	setWidth: (value: number) => void
}) {
	const { gap, width, minWidth, setWidth } = props

	const lineWidth = Math.floor(gap * 0.2)
	const [hover, hoverProps] = useHover()
	const right = -lineWidth / 2 - 0.5

	return (
		<div
			style={{
				position: "absolute",
				top: 0,
				bottom: 0,
				right: right,
				width: lineWidth,
				cursor: "col-resize",
				userSelect: "none",
				display: "flex",
				justifyContent: "center",
			}}
			onMouseDown={(e) => {
				const startX = e.clientX
				const startWidth = width

				const onMouseMove = (e: MouseEvent) => {
					const delta = e.clientX - startX
					const newWidth = Math.max(minWidth, startWidth + delta)
					setWidth(newWidth)
				}

				const onMouseUp = () => {
					document.removeEventListener("mousemove", onMouseMove)
					document.removeEventListener("mouseup", onMouseUp)
				}

				document.addEventListener("mousemove", onMouseMove)
				document.addEventListener("mouseup", onMouseUp)
			}}
			{...hoverProps}
		>
			<div
				style={{
					width: 1,
					height: "100%",
					backgroundColor: "var(--text-color)",
					boxShadow: hover ? `0 0 3px 1px var(--text-color)` : "none",
					transition: "box-shadow 0.2s ease-in-out",
				}}
			/>
		</div>
	)
}
