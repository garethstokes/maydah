package main

import (
    "web"
	"strconv"
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

func main() {
	// POST /login
	// Logs the user in
	web.Post("/login", func(ctx * web.Context) {
		ctx.SetHeader("Content-Type", "application/json", true);

		web.Config.CookieSecret = "colbert";
		message := Message{ Name: "Malcom Renoylds", Id: 1};
		ctx.SetSecureCookie("session", strconv.FormatInt(message.Id, 32), 0);

		ctx.Write(toJson(message));
	});

	// GET /rooms
	// Gets all the rooms
	web.Get("/rooms", func(ctx * web.Context) {
		ctx.SetHeader("Content-Type", "application/json", true);
		messages := []Message{getRoom()}
		fmt.Println(messages);

		response := toJson(messages);
		ctx.Write(response);
	});

	// GET /rooms/:id
	// Gets the room info
	web.Get("/rooms/([0-9]+)", func(ctx * web.Context, val string) {
		ctx.SetHeader("Content-Type", "application/json", true);
		id,_ := strconv.ParseInt(val, 0, 64);

		message := getRoom();
		message.Id = id;
		response := toJson(message);

		ctx.Write(response);
	});

	// GET /rooms/:id/users
	// gets the users for a room
	web.Get("/rooms/([0-9]+)/users", func(ctx * web.Context, val string) {
		ctx.SetHeader("Content-Type", "application/json", true);

		users := getUsers();
		response := toJson(users);
		ctx.Write(response);
	});

	// GET /rooms/$id/messaes
	// gets that last {n} messages for a room. 
	web.Get("/rooms/([0-9]+)/messages", func(ctx * web.Context, val string) {
		ctx.SetHeader("Content-Type", "application/json", true);

		ctx.Write(toJson(MESSAGE_STORE));
	});

	// POST /rooms/:id/messages
	// add a message to a room
	web.Post("/rooms/([0-9]+)/messages", func(ctx * web.Context, val string) {
		ctx.SetHeader("Content-Type", "application/json", true);

		message := Message{
			Name: "shut ya face, im here",
			Id: 3,
		};

		MESSAGE_STORE = append(MESSAGE_STORE, message);
		ctx.Write(toJson(message));
	});

    web.Run("0.0.0.0:9999")
}
