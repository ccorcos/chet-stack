import React from "react"

export function TokenInputDemo() {
	return <div>Work in progress</div>
}

// function TokenInput<T, V>(props: {
// 	tokens: T[]
// 	children: [
// 		(token: T, props: { selected: boolean }) => void,
// 		(value: V, props: { selected: boolean }) => void
// 	]

// 	text: string
// 	setText: (text: string) => void

// 	result:
// 		| { loading: true }
// 		| { loading: false; error: string }
// 		| { loading: false; error?: undefined; result: V[] }
// }) {
// 	return (
// 		<div>
// 			<ListBox items={[...props.tokens, "INPUT"]} selectedIndex={props.tokens.length} ></ListBox>

// 			{props.tokens.map((token) => props.children[0](token))}
// 			<span>
// 				<Input
// 					ref={inputRef}
// 					type="text"
// 					value={text}
// 					onChange={(e) => setText(e.target.value)}
// 					onFocus={() => setFocused(true)}
// 					onBlur={() => setFocused(false)}
// 				/>
// 				<Popup open={focused && text.length > 0} anchor={inputRef.current}>
// 					{error ? (
// 						<span style={{ color: "var(--red)" }}>{error}</span>
// 					) : !userIds ? (
// 						<Spinner />
// 					) : userIds.length === 0 ? (
// 						"No results..."
// 					) : (
// 						<ListBox items={userIds}>
// 							{(userId, { focused, selected }) => (
// 								<ListItem focused={focused} selected={selected}>
// 									<Username userId={userId} key={userId} />
// 								</ListItem>
// 							)}
// 						</ListBox>
// 					)}
// 				</Popup>
// 			</span>
// 		</div>
// 	)
// }
