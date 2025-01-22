import React from "react"
import { passthroughRef } from "./passthroughRef"

export function withStyle<T extends { style?: React.CSSProperties }>(
	Component: React.FC<T>,
	style: React.CSSProperties
) {
	return passthroughRef((props: T) => {
		return <Component {...props} style={{ ...style, ...props.style }} />
	})
}
