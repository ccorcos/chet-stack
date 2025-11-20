export type User = {
	id: string
	username: string
	/** ISO date string */
	createdAt: string
	/** ISO date string */
	updatedAt: string
}

export type Password = {
	userId: string
	passwordHash: string
	/** ISO date string */
	createdAt: string
	/** ISO date string */
	updatedAt: string
}

export type Auth = {
	token: string
	userId: string
	/** ISO date string */
	createdAt: string
}

export type Upload = {
	id: string
	filename: string
	/** ISO date string */
	createdAt: string
	userId: string
}
