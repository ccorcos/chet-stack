import { minBy } from "lodash"
import { useCallback, useEffect, useState } from "react"
import { useRefCurrent } from "./useRefCurrent"
import { useShortcut } from "./useShortcut"

type Rect = { top: number; left: number; width: number; height: number }

function center(rect: Rect) {
	return {
		y: rect.top + rect.height / 2,
		x: rect.left + rect.width / 2,
	}
}

type Point = { x: number; y: number }

function distance(a: Point, b: Point) {
	return Math.sqrt(Math.pow(a.x - b.x, 2) + Math.pow(a.y - b.y, 2))
}

export type DraggableListState =
	| {
			dragging: false
	  }
	| {
			dragging: true
			list: HTMLElement
			rects: { index: number; rect: Rect; element: HTMLElement }[]

			fromIndex: number
			elementRect: Rect
			element: HTMLElement
			offset: { x: number; y: number }
	  }

// onMouseDown attaches to the list container.
export function useDraggableList(args: {
	direction: "horizontal" | "vertical"
	onDragEnd: (args: { fromIndex: number; toIndex: number }) => void
}) {
	const [dragState, setDragState] = useState<DraggableListState>({ dragging: false })
	const dragStateRef = useRefCurrent(dragState)

	const onMouseDown = useCallback((event: React.MouseEvent) => {
		const element = (event.target as HTMLElement).closest("[data-drag-index]") as HTMLElement
		if (!element) return
		const fromIndex = Number(element.getAttribute("data-drag-index"))
		const list = event.currentTarget as HTMLElement

		// Expensive measurement.
		const rects: { index: number; rect: Rect; element: HTMLElement }[] = []
		const children = Array.from(list.querySelectorAll("[data-drag-index]"))
		for (const child of children) {
			const rect = child.getBoundingClientRect()
			const index = Number(child.getAttribute("data-drag-index"))
			rects.push({ index, rect, element: child as HTMLElement })
		}
		const elementRect = element.getBoundingClientRect()

		setDragState({
			dragging: true,
			list,
			rects,
			fromIndex,
			elementRect,
			element,
			offset: {
				x: event.clientX,
				y: event.clientY,
			},
		})
	}, [])

	useEffect(() => {
		const onMouseMove = (event: MouseEvent) => {
			const dragState = dragStateRef.current
			if (!dragState.dragging) return
			const { element, elementRect, fromIndex, offset, rects } = dragState

			// Drag the element
			const x = event.clientX - offset.x
			const y = event.clientY - offset.y
			element.style.transform = `translate(${x}px, ${y}px)`

			// Find the closest drop position.
			const hoverRect: Rect = {
				top: elementRect.top + y,
				left: elementRect.left + x,
				width: elementRect.width,
				height: elementRect.height,
			}

			const closest = minBy(rects, ({ rect }) => {
				return distance(center(hoverRect), center(rect))
			})

			if (!closest) return console.warn("No closest.")
			const toIndex = closest.index

			// Move the intermediate elements.
			for (const { element, rect, index } of rects) {
				if (index === fromIndex) continue

				element.style.transform = ""
				// fromIndex < toIndex and index is in between, move it down.
				if (index <= fromIndex && index >= toIndex) {
					if (args.direction === "vertical") {
						element.style.transform = `translate(0px, ${rect.height}px)`
					} else {
						element.style.transform = `translate(${rect.width}px, 0px)`
					}
				}
				// fromIndex > toIndex and index is in between, move it up.
				if (index >= fromIndex && index <= toIndex) {
					if (args.direction === "vertical") {
						element.style.transform = `translate(0px, ${-rect.height}px)`
					} else {
						element.style.transform = `translate(${-rect.width}px, 0px)`
					}
				}
			}
		}

		window.addEventListener("mousemove", onMouseMove)
		return () => window.removeEventListener("mousemove", onMouseMove)
	}, [])

	useEffect(() => {
		const onMouseUp = (event: MouseEvent) => {
			const dragState = dragStateRef.current
			if (!dragState.dragging) return
			const { elementRect, fromIndex, offset, rects } = dragState

			// Find the closest drop position.
			const x = event.clientX - offset.x
			const y = event.clientY - offset.y
			const hoverRect: Rect = {
				top: elementRect.top + y,
				left: elementRect.left + x,
				width: elementRect.width,
				height: elementRect.height,
			}

			const closest = minBy(rects, ({ rect }) => {
				return distance(center(hoverRect), center(rect))
			})

			if (!closest) throw new Error("No closest.")
			const toIndex = closest.index

			args.onDragEnd({ fromIndex, toIndex })

			// Clear all the transforms.
			for (const { element } of rects) element.style.transform = ""

			setDragState({ dragging: false })
		}

		window.addEventListener("mouseup", onMouseUp)
		return () => window.removeEventListener("mouseup", onMouseUp)
	}, [])

	useShortcut("escape", () => {
		const dragState = dragStateRef.current
		if (!dragState.dragging) return false
		for (const { element } of dragState.rects) element.style.transform = ""
		setDragState({ dragging: false })
	})

	return { onMouseDown, dragState }
}
