import React from "react"
import { useOnline } from "ui/hooks/useOnline"
import { Badge } from "./Badge"

export function OfflineBadge() {
	const online = useOnline()
	return (
		<Badge style={{ backgroundColor: online ? undefined : "var(--accent0)" }}>
			{online ? "Online" : <strong>Offline</strong>}
		</Badge>
	)
}
