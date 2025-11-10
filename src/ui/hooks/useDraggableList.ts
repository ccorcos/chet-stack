import { clamp, minBy } from "lodash-es"
import { useCallback, useEffect, useState } from "react"
import { useRefCurrent } from "./useRefCurrent"
import { useShortcut } from "./useShortcut"

// TODO: can we get rid of this?
const draggingZIndex: number | undefined = undefined // 101

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

type Bounds = { top: number; left: number; right: number; bottom: number }

export type DraggableListState =
	| {
			mousedown: false
			dragging: false
	  }
	| {
			mousedown: true
			dragging: false
			point: { x: number; y: number }

			fromIndex: number
			element: HTMLElement
			list: HTMLElement
	  }
	| {
			mousedown: true
			dragging: true
			point: { x: number; y: number }

			fromIndex: number
			element: HTMLElement
			list: HTMLElement

			rects: { index: number; rect: Rect; element: HTMLElement }[]
			bounds: Bounds
			elementRect: Rect
	  }

function measureRects(list: HTMLElement) {
	// Expensive measurement.
	const rects: { index: number; rect: Rect; element: HTMLElement }[] = []
	const children = Array.from(list.querySelectorAll("[data-drag-index]"))
	for (const child of children) {
		const rect = child.getBoundingClientRect()
		const index = Number(child.getAttribute("data-drag-index"))
		rects.push({ index, rect, element: child as HTMLElement })
	}
	return rects
}

function computeBounds(rects: Rect[]) {
	// Bounds so that we can't drag the element outside of the list.
	const bounds = {
		top: rects[0].top,
		left: rects[0].left,
		right: rects[0].left + rects[0].width,
		bottom: rects[0].top + rects[0].height,
	}
	for (const rect of rects) {
		bounds.top = Math.min(bounds.top, rect.top)
		bounds.left = Math.min(bounds.left, rect.left)
		bounds.right = Math.max(bounds.right, rect.left + rect.width)
		bounds.bottom = Math.max(bounds.bottom, rect.top + rect.height)
	}
	return bounds
}

const stopNextClick = (element: HTMLElement) => {
	const onClick = (event: Event) => {
		event.stopPropagation()
		element.removeEventListener("click", onClick)
	}
	setTimeout(() => {
		// Cleanup in case the click event never happened.
		element.removeEventListener("click", onClick)
	}, 0)
	element.addEventListener("click", onClick)
}

/**
 * onMouseDown attaches to the list container.
 * Important that items have a data-drag-index attribute.
 */
export function useDraggableList(args: {
	direction: "horizontal" | "vertical"
	onDragEnd: (args: { fromIndex: number; toIndex: number }) => void
}) {
	const [dragState, setDragState] = useState<DraggableListState>({
		mousedown: false,
		dragging: false,
	})
	const dragStateRef = useRefCurrent(dragState)

	const onMouseDown = useCallback((event: React.MouseEvent) => {
		const element = (event.target as HTMLElement).closest("[data-drag-index]") as HTMLElement
		if (!element) return
		const fromIndex = Number(element.getAttribute("data-drag-index"))
		const list = event.currentTarget as HTMLElement

		setDragState({
			dragging: false,
			mousedown: true,
			fromIndex,
			element,
			list,
			point: { x: event.clientX, y: event.clientY },
		})

		// const rects = measureRects(list)
		// const elementRect = element.getBoundingClientRect()
		// const bounds = computeBounds(rects.map(({ rect }) => rect))

		// setDragState({
		// 	dragging: true,
		// 	mousedown: true,
		// 	list,
		// 	rects,
		// 	bounds,
		// 	fromIndex,
		// 	elementRect,
		// 	element,
		// 	point: {
		// 		x: event.clientX,
		// 		y: event.clientY,
		// 	},
		// })
	}, [])

	useEffect(() => {
		const onMouseMove = (event: MouseEvent) => {
			let dragState = dragStateRef.current
			if (!dragState.mousedown) return

			if (!dragState.dragging) {
				const point = { x: event.clientX, y: event.clientY }
				const moved = distance(point, dragState.point)
				if (moved < 8) return

				const { element, list } = dragState
				const rects = measureRects(list)
				const elementRect = element.getBoundingClientRect()
				const bounds = computeBounds(rects.map(({ rect }) => rect))

				dragState = {
					...dragState,
					dragging: true,
					rects,
					bounds,
					elementRect,
				}

				setDragState(dragState)
				event.preventDefault()
			}

			const { element, elementRect, fromIndex, point, rects, bounds } = dragState

			// Drag the element
			// const x = event.clientX - offset.x
			// const y = event.clientY - offset.y

			// Drag the element within the bounds.
			const y = clamp(
				event.clientY - point.y,
				bounds.top - elementRect.top,
				bounds.bottom - elementRect.top - elementRect.height
			)
			const x = clamp(
				event.clientX - point.x,
				bounds.left - elementRect.left,
				bounds.right - elementRect.left - elementRect.width
			)

			element.style.transform = `translate(${x}px, ${y}px)`
			element.style.zIndex = "1" // Place above its siblings.

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
						element.style.transform = `translate(0px, ${elementRect.height}px)`
					} else {
						element.style.transform = `translate(${elementRect.width}px, 0px)`
					}
				}
				// fromIndex > toIndex and index is in between, move it up.
				if (index >= fromIndex && index <= toIndex) {
					if (args.direction === "vertical") {
						element.style.transform = `translate(0px, ${-elementRect.height}px)`
					} else {
						element.style.transform = `translate(${-elementRect.width}px, 0px)`
					}
				}
			}
		}

		window.addEventListener("mousemove", onMouseMove)
		return () => window.removeEventListener("mousemove", onMouseMove)
	}, [])

	const argsRef = useRefCurrent(args)
	useEffect(() => {
		const onMouseUp = (event: MouseEvent) => {
			const dragState = dragStateRef.current

			if (!dragState.mousedown) return

			if (!dragState.dragging) {
				setDragState({ dragging: false, mousedown: false })
				return
			}

			const { element, elementRect, fromIndex, point, rects } = dragState
			// Find the closest drop position.
			const x = event.clientX - point.x
			const y = event.clientY - point.y
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
			argsRef.current.onDragEnd({ fromIndex, toIndex })

			element.style.zIndex = ""
			// Clear all the transforms.
			for (const { element } of rects) element.style.transform = ""

			setDragState({ dragging: false, mousedown: false })

			// We don't want to click on drop.
			stopNextClick(event.target as HTMLElement)
		}

		window.addEventListener("pointerup", onMouseUp)
		return () => window.removeEventListener("pointerup", onMouseUp)
	}, [])

	useShortcut("escape", () => {
		const dragState = dragStateRef.current
		if (!dragState.mousedown) return false

		if (dragState.dragging) {
			for (const { element } of dragState.rects) element.style.transform = ""
		}

		setDragState({ dragging: false, mousedown: false })
	})

	return { onMouseDown, dragState }
}
