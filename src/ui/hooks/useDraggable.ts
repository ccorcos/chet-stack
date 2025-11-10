import { useCallback, useEffect, useState } from "react"
import { useRefCurrent } from "./useRefCurrent"

export type DraggableState =
	| {
			dragging: false
	  }
	| {
			dragging: true
			offset: { x: number; y: number }
			element: HTMLElement
	  }

export function useDraggable(
	args: { onDragEnd?: (position: { x: number; y: number }) => void } = {}
) {
	const [dragState, setDragState] = useState<DraggableState>({ dragging: false })
	const dragStateRef = useRefCurrent(dragState)

	const onMouseDown = useCallback((event: React.MouseEvent) => {
		const item = event.currentTarget as HTMLElement
		setDragState({
			dragging: true,
			offset: {
				x: event.clientX,
				y: event.clientY,
			},
			element: item,
		})
	}, [])

	useEffect(() => {
		const onMouseMove = (event: MouseEvent) => {
			const dragState = dragStateRef.current
			if (!dragState.dragging) return

			const item = dragState.element
			const x = event.clientX - dragState.offset.x
			const y = event.clientY - dragState.offset.y
			item.style.transform = `translate(${x}px, ${y}px)`
		}

		window.addEventListener("mousemove", onMouseMove)
		return () => window.removeEventListener("mousemove", onMouseMove)
	}, [])

	useEffect(() => {
		const onMouseUp = (event: MouseEvent) => {
			const dragState = dragStateRef.current
			if (!dragState.dragging) return

			const x = event.clientX - dragState.offset.x
			const y = event.clientY - dragState.offset.y

			args.onDragEnd?.({ x, y })
			const item = dragState.element
			item.style.transform = ""
			setDragState({ dragging: false })
		}

		window.addEventListener("mouseup", onMouseUp)
		return () => window.removeEventListener("mouseup", onMouseUp)
	}, [])

	return { onMouseDown, dragState }
}
