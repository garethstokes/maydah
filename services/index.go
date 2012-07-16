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

func main() {
	/*
	web.Get("/rooms$", func(ctx * web.Context) {
		ctx.SetHeader("Content-Type", "application/json", true);
		ctx.WriteString("[]");
	});
	*/

	web.Get("/rooms/([0-9]+)", func(ctx * web.Context, val string) {
		ctx.SetHeader("Content-Type", "application/json", true);
		id,_ := strconv.ParseInt(val, 0, 64);

		message := Message{
			Name: "/rooms",
			Id:	id,
		}

		b, err := json.Marshal(message)
		if err != nil {
			fmt.Println("error:", err)
		}

		ctx.Write(b);
	});

    web.Run("0.0.0.0:9999")
}
