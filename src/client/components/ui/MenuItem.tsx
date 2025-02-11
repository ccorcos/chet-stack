import React, { useLayoutEffect, useRef } from "react"
import { scrollIntoView } from "../../../shared/scrollHelpers"
import { mergeRefs } from "../../helpers/mergeRefs"
import { passthroughRef } from "../../helpers/passthroughRef"

/** MenuItem is not meant to be focusable by the browser like a ListItem is, so we need to handle focus/scroll ourselves. */
export const MenuItem = passthroughRef(
	(props: JSX.IntrinsicElements["div"] & { selected?: boolean }) => {
		const ref = useRef<HTMLDivElement>(null)
		const merged = mergeRefs([ref, props.ref])

		useLayoutEffect(() => {
			if (!props.selected) return
			if (!ref.current) return
			scrollIntoView(ref.current)
		}, [props.selected])

		return (
			<div
				{...props}
				ref={merged}
				style={{
					cursor: "pointer",
					backgroundColor: props.selected ? "var(--blue)" : undefined,
					...props.style,
				}}
			/>
		)
	}
)
