package main

type Room struct {
	Id int64
	Name string
}

func (r Room) EqualTo(room Room) (string, bool) {
	if r.Name != room.Name {
		return "Name", false;
	}

	/*
	if u.Id != user.Id {
		return "Id", false;
	}
	*/

	return "", true;
}
