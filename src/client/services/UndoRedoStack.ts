import { Transaction } from "../../shared/transaction"

export class UndoRedoStack {
	checkpoint = 0
	undoStack: Transaction[] = []
	redoStack: Transaction[] = []
}
