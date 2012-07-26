package main

type Message struct {
	Id int
	RoomId int
	UserId int
	Message string
}

func (m Message) EqualTo(message Message) (string, bool) {
	if m.RoomId != message.RoomId {
		return "RoomId", false
	}

	if m.UserId != message.UserId {
		return "UserId", false
	}

	if m.Message != message.Message {
		return "Message", false
	}

	/*
	if u.Id != user.Id {
		return "Id", false;
	}
	*/

	return "", true;
}
