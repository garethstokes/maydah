package main

import (
	"fmt"
	"encoding/json"
)

type Message struct {
	Name string
	Id int64
}

func getRoom() Message {
	return Message{
		Name: "Joss whedon's fan club",
		Id:	1,
	}
}

func getUsers() []Message {
	mal := Message{
		Name: "Malcom Renyolds",
		Id:	1,
	};
	kaylee := Message{
		Name: "Kaylee Frye",
		Id: 2,
	};

	return []Message{
		mal,
		kaylee,
	};
}

func getMessages() []Message {
	a := Message{
		Name: "Role call!!",
		Id: 1,
	};

	b := Message{
		Name: "Im here capt'n",
		Id: 2,
	};

	c := Message{
		Name: "Good work kaylee, now where is that lazy, no good Jayne?",
		Id: 1,
	};

	return []Message{a,b,c};
}

func toJson(item interface{}) []byte {
	b, err := json.Marshal(item)
	if err != nil {
		fmt.Println("error:", err)
	}
	return b;
}

var (
	MESSAGE_STORE []Message
)

func init() {
	MESSAGE_STORE = getMessages();
}
