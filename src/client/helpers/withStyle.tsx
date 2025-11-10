import React from "react"

export function withStyle<T extends { style?: React.CSSProperties }>(
	Component: React.FC<T>,
	style: React.CSSProperties
) {
	return function StyledComponent(props: T) {
		return <Component {...props} style={{ ...style, ...props.style }} />
	}
}
