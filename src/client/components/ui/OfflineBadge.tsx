import React from "react"
import { useOnline } from "../../hooks/useOnline"
import { Badge } from "./Badge"

export function OfflineBadge() {
	const online = useOnline()
	return (
		<Badge style={{ backgroundColor: online ? undefined : "var(--orange)" }}>
			{online ? "Online" : <strong>Offline</strong>}
		</Badge>
	)
}
