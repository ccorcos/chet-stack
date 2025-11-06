import React from "react"
import {
	BottombarLayout,
	ContentLayout,
	Layout,
	LeftPanelLayout,
	RightPanelLayout,
	TopbarLayout,
} from "../components/Layout"

// css(`
// .layer {
// 	background: blue;
// 	opacity: 0.5;
// 	border: 2px solid transparent;
// }
// `)

export function LayersDemo() {
	return (
		<Layout
			Topbar={
				<TopbarLayout className="layer" show={true}>
					Topbar Content
				</TopbarLayout>
			}
			LeftPanel={
				<LeftPanelLayout className="layer" show={true}>
					Left Panel Content
				</LeftPanelLayout>
			}
			RightPanel={
				<RightPanelLayout className="layer" show={true}>
					Right Panel Content
				</RightPanelLayout>
			}
			Bottombar={
				<BottombarLayout className="layer" show={true}>
					Bottombar Content
				</BottombarLayout>
			}
		>
			<ContentLayout className="layer">Main Content</ContentLayout>
		</Layout>
	)
}
