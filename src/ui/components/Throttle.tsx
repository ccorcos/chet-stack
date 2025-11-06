import React, { useEffect, useRef, useState } from "react"

// TODO: I don't think this thing works very well.

/**
 * Don't show the spinner unless we have a very slow request.
 * If we show the spinner, hold it for a moment.
 * Hold previous children while we wait for the spinner.
 */
export function Throttle(props: {
	showSpinner: boolean
	showDelay?: number
	showHold?: number
	spinner: React.ReactNode
	children: React.ReactNode
}) {
	const showDelay = typeof props.showDelay === "number" ? props.showDelay : 300
	const showHold = typeof props.showHold === "number" ? props.showHold : 300

	const [showSpinner, setShowSpinner] = useState(false)

	useEffect(() => {
		let canceled = false

		if (props.showSpinner && !showSpinner) {
			setTimeout(() => {
				if (canceled) return
				setShowSpinner(true)
			}, showDelay)
		}

		if (!props.showSpinner && showSpinner) {
			setTimeout(() => {
				if (canceled) return
				setShowSpinner(false)
			}, showHold)
		}

		return () => {
			canceled = true
		}
	}, [showSpinner, props.showSpinner])

	const prevChildrenRef = useRef(props.children)
	const prevChildren = prevChildrenRef.current
	prevChildrenRef.current = props.children

	// If we're blocking the spinner, show previous children.
	if (props.showSpinner && !showSpinner) return prevChildren
	if (showSpinner) return props.spinner
	return props.children
}
