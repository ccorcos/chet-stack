import React from "react"
import { Player, useAppState } from "../AppState"
import { useEnvironment } from "../Environment"

export function App() {
	const { app } = useEnvironment()
	const players = useAppState((game) => game.players)
	return (
		<div
			style={{
				maxWidth: "100%",
				width: "24em",
				margin: "0 auto",
			}}
		>
			{players.map((player, index) => (
				<Player player={player} index={index} key={index} />
			))}
			<button onClick={() => app.dispatch.addPlayer()}>Add Player</button>
		</div>
	)
}

function Player(props: { player: Player; index: number }) {
	const { player, index } = props
	const { app } = useEnvironment()

	return (
		<div
			style={{ display: "flex", flexDirection: "column", paddingBottom: "2em" }}
		>
			<input
				style={{ textAlign: "center" }}
				placeholder={`Player ${index + 1}`}
				value={player.name}
				onChange={(event) => app.dispatch.editName(index, event.target!.value)}
			/>
			<div style={{ display: "flex", marginTop: 4 }}>
				<button
					style={{ flex: 1 }}
					onClick={() => app.dispatch.incrementScore(index, -1)}
				>
					-1
				</button>
				<div style={{ padding: "1em" }}>{player.score}</div>
				<button
					style={{ flex: 1 }}
					onClick={() => app.dispatch.incrementScore(index, +1)}
				>
					+1
				</button>
			</div>
		</div>
	)
}
