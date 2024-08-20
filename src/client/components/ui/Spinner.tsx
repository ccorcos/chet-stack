import React from "react"

/** Consider using <Loading/> instead. */
export function Spinner(props: { size?: string }) {
	return <span style={{ height: props.size, width: props.size }} className="spinner"></span>
}
