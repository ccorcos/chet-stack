import React, { useState } from "react"
import { useClientEnvironment } from "../services/ClientEnvironment"
import { useRoute } from "../services/Router"
import { Button } from "./ui/Button"

export function App() {
	const environment = useClientEnvironment()
	const route = useRoute()

	// return <div style={{ display: "flex", height: "100vh" }}>hello world</div>
	return <Layout />
}

function TopbarLayout(props: { show: boolean; setShow: (show: boolean) => void }) {
	return (
		<div
			style={{
				flexGrow: 0,
				flexShrink: 0,
				borderBottom: "2px solid var(--transparent1)",
				transition: !props.show ? "height 0.1s ease-in" : "height 0.1s ease-out",
				height: props.show ? 64 : 0,
				overflow: "hidden",
			}}
		>
			<div style={{ display: "flex", alignItems: "center", height: "100%", width: "100%" }}>
				<Button onClick={() => props.setShow(!props.show)}>{props.show ? "close" : "open"}</Button>
			</div>
		</div>
	)
}

function BottombarLayout(props: { show: boolean; setShow: (show: boolean) => void }) {
	return (
		<div
			style={{
				flexGrow: 0,
				flexShrink: 0,
				borderTop: "2px solid var(--transparent1)",
				transition: !props.show ? "height 0.1s ease-in" : "height 0.1s ease-out",
				height: props.show ? 64 : 0,
				overflow: "hidden",
			}}
		>
			<div
				style={{
					padding: 8,
					display: "flex",
					justifyContent: "space-between",
					alignItems: "center",
				}}
			>
				<span>Footer content</span>
				<button
					onClick={() => props.setShow(!props.show)}
					style={{ background: "none", border: "none", color: "white", cursor: "pointer" }}
				>
					{props.show ? "down" : "up"}
				</button>
			</div>
		</div>
	)
}

function LeftPanelLayout(props: { show: boolean; setShow: (show: boolean) => void }) {
	return (
		<div
			style={{
				flexGrow: 0,
				flexShrink: 0,
				borderRight: "2px solid var(--transparent1)",
				transition: !props.show ? "width 0.1s ease-in" : "width 0.1s ease-out",
				width: props.show ? 256 : 0,
				overflow: "hidden",
			}}
		>
			<div style={{ padding: "16px" }}>
				<h2>Sidebar</h2>
				<button onClick={() => props.setShow(!props.show)} style={{ marginTop: "16px" }}>
					{props.show ? "left" : "right"}
				</button>
			</div>
		</div>
	)
}

function RightPanelLayout(props: { show: boolean; setShow: (show: boolean) => void }) {
	return (
		<div
			style={{
				flexGrow: 0,
				flexShrink: 0,
				borderLeft: "2px solid var(--transparent1)",
				transition: !props.show ? "width 0.1s ease-in" : "width 0.1s ease-out",
				width: props.show ? 256 : 0,
				overflow: "hidden",
			}}
		>
			<div style={{ padding: "16px" }}>
				<h2>Right Panel</h2>
				<button onClick={() => props.setShow(!props.show)} style={{ marginTop: "16px" }}>
					{props.show ? "right" : "left"}
				</button>
			</div>
		</div>
	)
}

function Layout() {
	const [showTopbar, setShowTopbar] = useState(true)
	const [showSidebar, setShowSidebar] = useState(true)
	const [showRightPanel, setShowRightPanel] = useState(true)
	const [showBottomBar, setShowBottomBar] = useState(true)

	return (
		<div style={{ height: "100vh", display: "flex", flexDirection: "column" }}>
			<TopbarLayout show={showTopbar} setShow={setShowTopbar} />

			<div style={{ flexGrow: 1, display: "flex", overflow: "hidden" }}>
				<LeftPanelLayout show={showSidebar} setShow={setShowSidebar} />

				<div style={{ flexGrow: 1, overflowY: "auto", padding: "16px" }}>
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
				</div>

				<RightPanelLayout show={showRightPanel} setShow={setShowRightPanel} />
			</div>

			<BottombarLayout show={showBottomBar} setShow={setShowBottomBar} />
		</div>
	)
}
