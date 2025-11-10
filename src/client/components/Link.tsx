import React from "react"
import { Route, formatRoute } from "shared/routeHelpers"
import { useClientEnvironment } from "../services/ClientEnvironment"

// TODO: there is probably a more general way of intercepting all navigations to use pushState.
export function Link(props: JSX.IntrinsicElements["a"] & { route: Route }) {
	const { router } = useClientEnvironment()
	return (
		<a
			{...props}
			className={["feedback", props.className].filter(Boolean).join(" ")}
			style={{
				cursor: "pointer",
				...props.style,
			}}
			onClick={(e) => {
				router.navigate(formatRoute(props.route))
				if (props.onClick) props.onClick(e)
			}}
		/>
	)
}
