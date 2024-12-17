import React, { forwardRef } from "react"

/**
 * Allow props.ref to get passed through props to children.
 * Consider using `mergeRefs` instead if you need to use the ref inside the component.
 */
export function passthroughRef<P>(fn: React.FC<P>): React.FC<P> {
	return forwardRef((props: any, ref) => fn({ ref, ...props })) as React.FC<P>
}
