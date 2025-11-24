Create an application called Renegate Chat with baseUrl `renegade.chat`. Do this my modifying the client, server, and database packages.

The way it works is that every chatroom has a unique uuid and a set of owners. All chatrooms are publicly visible.

You have to be logged in to create new chatrooms, but if you're logged out you can still participate as a psuedonomous user. You can reply and create a username if you'd like. And later, you can signup if you want.

In the sidebar are all the chats that you've created or found. The interesting thing about this app is that there is no discovery mechanism in the app for finding chatrooms. You can only get to them via direct link from someone else out of band.

Lets worry about permissions for reads and writes later and focus on just building all of the basic mechanics of the application.


---

Since we're using tupledb, we don't need to over-normalize out schema.

Rooms should have a list of owners directly on the room:

type Room = {
	id: string
	name: string
	owners: string[]
	/** ISO date string */
	createdAt: string
	/** ISO date string */
	updatedAt: string
}

And we can index on that with fanout

function createRoom(db: TupleDb, room: Room) {
	db.set(["room/id", room.id], room)
	for (const owner of room)
		db.set(["room/member", owner, room.id], null)
}


For writing to the database, we should useWrite to make sure we're updating the cache appropriately

Also be careful when updating the database to delete stale data. updateMessage doesn't delete the old listing for messages for example once its updated.
