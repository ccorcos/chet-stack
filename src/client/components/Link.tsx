import React from "react"
import { Route } from "../../shared/routeHelpers"
import { passthroughRef } from "../helpers/passthroughRef"
import { useClientEnvironment } from "../services/ClientEnvironment"

function _Link(props: JSX.IntrinsicElements["a"] & { route: Route }) {
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
				router.navigate(props.route)
				if (props.onClick) props.onClick(e)
			}}
		/>
	)
}

export const Link = passthroughRef(_Link)
