import React from "react"
import { passthroughRef } from "../helpers/passthroughRef"

/** MenuItem is not meant to be focusable by the browser like a ListItem is. */
export const MenuItem = passthroughRef(
	(props: JSX.IntrinsicElements["div"] & { selected?: boolean; onSubmit?: () => void }) => {
		return (
			<div
				{...props}
				className={["menu-item", props.className].filter(Boolean).join(" ")}
				style={{ backgroundColor: props.selected ? "var(--blue)" : undefined, ...props.style }}
			/>
		)
	}
)
