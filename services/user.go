package main

type User struct {
	Id int64
	Name string
	Email string
}

func userValidate(email string, password string) User {
	user := User{
		Name: "Malcom Renyolds",
		Email: email,
		Id: 1,
	}
	return user;
}

func userDelete(id int) {
	// delete stuff
}
