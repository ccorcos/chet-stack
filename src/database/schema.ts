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

export type AuthToken = {
	authToken: string
	userId: string
	/** ISO date string */
	createdAt: string
}
