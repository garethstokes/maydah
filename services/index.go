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

func toJson(item interface{}) []byte {
	b, err := json.Marshal(item)
	if err != nil {
		fmt.Println("error:", err)
	}
	return b;
}

func main() {
	web.Get("/rooms", func(ctx * web.Context) {
		ctx.SetHeader("Content-Type", "application/json", true);
		messages := []Message{getRoom()}
		fmt.Println(messages);

		response := toJson(messages);
		ctx.Write(response);
	});

	web.Get("/rooms/([0-9]+)", func(ctx * web.Context, val string) {
		ctx.SetHeader("Content-Type", "application/json", true);
		id,_ := strconv.ParseInt(val, 0, 64);

		message := getRoom();
		message.Id = id;
		response := toJson(message);

		ctx.Write(response);
	});

	web.Get("/rooms/([0-9]+)/users", func(ctx * web.Context, val string) {
		ctx.SetHeader("Content-Type", "application/json", true);

		users := getUsers();
		response := toJson(users);
		ctx.Write(response);
	});

    web.Run("0.0.0.0:9999")
}
