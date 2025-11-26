type User = { id: string; name: string; roomIds: string[] }
type Room = { id: string; name: string; ownerIds: string[] }
type Message = { id: string; roomId: string; userId: string; text: string }
