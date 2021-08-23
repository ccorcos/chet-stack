import { Environment } from "../Environment"

export function deletePlayer(environment: Environment, index: number) {
	const player = environment.app.state.players[index]
	if (!player) return
	const playerName = player.name || `Player ${index + 1}`
	const response = window.confirm(`Are you want to delete ${playerName}?`)
	if (!response) return
	environment.app.dispatch.deletePlayer(index)
}
