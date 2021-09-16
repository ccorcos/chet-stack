import React from "react"
import { deletePlayer } from "../actions/deletePlayer"
import { resetGame } from "../actions/resetGame"
import { Player, useAppState } from "../AppState"
import { useEnvironment } from "../Environment"

export function App() {
	const environment = useEnvironment()
	const { app } = environment
	const players = useAppState((game) => game.players)
	return (
		<div
			style={{
				maxWidth: "100%",
				width: "24em",
				margin: "0 auto",
			}}
		>
			<h2>Score Counter2</h2>
			{players.map((player, index) => (
				<Player player={player} index={index} key={index} />
			))}
			<div style={{ display: "flex", gap: 8 }}>
				<button onClick={() => app.dispatch.addPlayer()}>Add Player</button>
				<button onClick={() => resetGame(environment)}>Reset Game</button>
			</div>
		</div>
	)
}

function Player(props: { player: Player; index: number }) {
	const { player, index } = props
	const environment = useEnvironment()
	const { app } = environment

	return (
		<div style={{ display: "flex", paddingBottom: 8 }}>
			<div
				style={{
					marginRight: 8,
					position: "relative",
					flex: 1,
					display: "flex",
				}}
			>
				<input
					style={{
						flex: 1,
						paddingTop: 6,
						paddingBottom: 6,
						textAlign: "left",
						paddingRight: "3em",
						width: "1em",
					}}
					placeholder={`Player ${index + 1}`}
					value={player.name}
					onChange={(event) =>
						app.dispatch.editName(index, event.target!.value)
					}
				/>
				<div
					style={{
						position: "absolute",
						right: 0,
						height: "100%",
						display: "flex",
						alignItems: "center",
						justifyContent: "center",
					}}
				>
					<button
						style={{
							fontSize: 12,
							border: "none",
							background: "transparent",
							color: "red",
						}}
						onClick={() => deletePlayer(environment, index)}
					>
						Delete
					</button>
				</div>
			</div>
			<div style={{ display: "flex" }}>
				<div>
					<button
						style={{ flex: 1, padding: "6px 16px" }}
						onClick={() => app.dispatch.incrementScore(index, -1)}
					>
						-1
					</button>
				</div>
				<div
					style={{
						padding: "1px 0px",
						minWidth: "2em",
						textAlign: "center",
						lineHeight: "36px",
					}}
				>
					{player.score}
				</div>
				<div>
					<button
						style={{ flex: 1, padding: "6px 16px" }}
						onClick={() => app.dispatch.incrementScore(index, +1)}
					>
						+1
					</button>
				</div>
			</div>
		</div>
	)
}
