/*

Session management

- sessionAdd(id int, user User);

*/
package main

import "time"

type UserSession struct {
	Data * User
	Timestamp time.Time
}

var (
	store map[int64]UserSession;
)

func init() {
	store = map[int64]UserSession {};
}

func sessionAdd(id int64, user * User) {
	session := UserSession{
		Data: user,
		Timestamp: time.Now(),
	}
	store[id] = session;
}
