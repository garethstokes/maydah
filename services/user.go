package main

type User struct {
	Id int64
	Name string
	Email string
}

func (u User) EqualTo(user User) (string, bool) {
	if u.Name != user.Name {
		return "Name", false;
	}

	if u.Email != user.Email {
		return "Email", false;
	}

	/*
	if u.Id != user.Id {
		return "Id", false;
	}
	*/

	return "", true;
}
