import React, { useLayoutEffect } from "react"
import { scrollIntoView } from "shared/scrollHelpers"
import { usePropRef } from "ui/hooks/usePropRef"

/** MenuItem is not meant to be focusable by the browser like a ListItem is, so we need to handle focus/scroll ourselves. */
export function MenuItem(props: React.JSX.IntrinsicElements["div"] & { selected?: boolean }) {
	const ref = usePropRef(props.ref)

	useLayoutEffect(() => {
		if (!props.selected) return
		if (!ref.current) return
		scrollIntoView(ref.current)
	}, [props.selected])

	return (
		<div
			{...props}
			ref={ref}
			style={{
				cursor: "pointer",
				backgroundColor: props.selected ? "var(--accent0)" : undefined,
				...props.style,
			}}
		/>
	)
}
