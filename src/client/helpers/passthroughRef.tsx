import React, { forwardRef } from "react"

export function passthroughRef<P>(fn: React.FC<P>): React.FC<P> {
	return forwardRef((props: any, ref) => fn({ ref, ...props })) as React.FC<P>
}
