import React, { useState } from "react"
import { Button } from "../components/Button"
import {
	BottombarLayout,
	ContentLayout,
	Layout,
	LeftPanelLayout,
	RightPanelLayout,
	TopbarLayout,
} from "../components/Layout"
import { useGlobalShortcut } from "../hooks/useShortcut"

export function LayoutDemo() {
	const [showTopbar, setShowTopbar] = useState(true)
	const [showSidebar, setShowSidebar] = useState(true)
	const [showRightPanel, setShowRightPanel] = useState(true)
	const [showBottomBar, setShowBottomBar] = useState(true)

	// TODO: could return keydown to handle this.
	useGlobalShortcut("up", () => setShowTopbar(!showTopbar))
	useGlobalShortcut("left", () => setShowSidebar(!showSidebar))
	useGlobalShortcut("right", () => setShowRightPanel(!showRightPanel))
	useGlobalShortcut("down", () => setShowBottomBar(!showBottomBar))

	return (
		<Layout
			Topbar={
				<TopbarLayout show={showTopbar} className="layer">
					<div style={{ display: "flex", alignItems: "center", height: "100%", width: "100%" }}>
						<Button onClick={() => setShowTopbar(!showTopbar)}>
							{showTopbar ? "close" : "open"}
						</Button>
					</div>
				</TopbarLayout>
			}
			Bottombar={
				<BottombarLayout show={showBottomBar} className="layer">
					<div
						style={{
							padding: 8,
							display: "flex",
							justifyContent: "space-between",
							alignItems: "center",
						}}
					>
						<Button onClick={() => setShowBottomBar(!showBottomBar)}>
							{showBottomBar ? "close" : "open"}
						</Button>
					</div>
				</BottombarLayout>
			}
			LeftPanel={
				<LeftPanelLayout show={showSidebar} className="layer">
					<div style={{ padding: "16px" }}>
						<Button onClick={() => setShowSidebar(!showSidebar)} style={{ marginTop: "16px" }}>
							{showSidebar ? "close" : "open"}
						</Button>
						{[...Array(200)].map((_, i) => (
							<p key={i} style={{ marginBottom: "16px" }}>
								Scroll content {i + 1}
							</p>
						))}
					</div>
				</LeftPanelLayout>
			}
			RightPanel={
				<RightPanelLayout show={showRightPanel} className="layer">
					<div style={{ padding: "16px" }}>
						<Button
							onClick={() => setShowRightPanel(!showRightPanel)}
							style={{ marginTop: "16px" }}
						>
							{showRightPanel ? "close" : "open"}
						</Button>
						{[...Array(200)].map((_, i) => (
							<p key={i} style={{ marginBottom: "16px" }}>
								Scroll content {i + 1}
							</p>
						))}
					</div>
				</RightPanelLayout>
			}
		>
			<ContentLayout>
				<h2>Main Content</h2>
				<div style={{ marginTop: "16px", display: "flex", gap: 12 }}>
					<Button onClick={() => setShowTopbar(!showTopbar)}>Toggle Topbar</Button>
					<Button onClick={() => setShowSidebar(!showSidebar)}>Toggle Sidebar</Button>
					<Button onClick={() => setShowRightPanel(!showRightPanel)}>Toggle Right Panel</Button>
					<Button onClick={() => setShowBottomBar(!showBottomBar)}>Toggle Bottom Bar</Button>
				</div>
				{[...Array(20)].map((_, i) => (
					<p key={i} style={{ marginBottom: "16px" }}>
						Scroll content {i + 1}
					</p>
				))}
			</ContentLayout>
		</Layout>
	)
}
