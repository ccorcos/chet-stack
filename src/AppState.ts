import { useEffect, useMemo, useState } from "react"
import { useEnvironment } from "./Environment"
import { shallowEqual } from "./helpers/shallowEqual"
import { useRefCurrent } from "./hooks/useRefCurrent"
import { StateMachine } from "./StateMachine"

export type Player = { name: string; score: number }

export type Game = { players: Player[] }

function newPlayer(): Player {
	return { name: "", score: 0 }
}

function newGame(): Game {
	return { players: [newPlayer()] }
}

const reducers = {
	addPlayer(game: Game) {
		const { players } = game
		return { players: [...players, newPlayer()] }
	},
	editName(game: Game, index: number, newName: string) {
		const players = game.players.map((player, i) => {
			if (i !== index) return player
			return { ...player, name: newName }
		})
		return { players }
	},
	incrementScore(game: Game, index: number, delta: number) {
		const players = game.players.map((player, i) => {
			if (i !== index) return player
			return { ...player, score: player.score + delta }
		})
		return { players }
	},
}

export class AppState extends StateMachine<Game, typeof reducers> {
	constructor() {
		super(newGame(), reducers)
	}
}

export function useAppState<T>(selector: (state: Game) => T) {
	const { app } = useEnvironment()
	const initialState = useMemo(() => {
		return selector(app.state)
	}, [])

	const [state, setState] = useState(initialState)
	const currentStateRef = useRefCurrent(state)

	useEffect(() => {
		return app.addListener(() => {
			const nextState = selector(app.state)
			if (shallowEqual(currentStateRef.current, nextState)) return
			setState(nextState)
		})
	}, [])

	return state
}
