import { Environment } from "../Environment"

export function resetGame(environment: Environment) {
	const response = window.confirm(`Are you want to reset the game?`)
	if (!response) return
	environment.app.dispatch.resetGame()
}
