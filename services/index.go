package main

import (
    "web"
	"strconv"
	"fmt"
)

type ApiResponse struct {
	Ok bool
	Result interface{}
}

func init() {
	web.Config.CookieSecret = "I am a pole and so can you";
}

func apiError(ctx * web.Context, message string) {
	response := ApiResponse{
		Ok: false,
		Result: message,
	};
	ctx.Write(toJson(response));
}

func api(verb string, route string, callback func(* web.Context)) {
	// wrap our secure code around the caller's handler
	handler := func(ctx * web.Context) {
		ctx.ContentType("json");

		// pull out the user data from the session
		cookie, success := ctx.GetSecureCookie("session");
		if !success {
			ctx.Server.Logger.Println("Session cookie is invalid");
			apiError(ctx, "Invalid session cookie");
			return;
		}

		if cookie == "" {
			apiError(ctx, "Corrupt user data");
			return;
		}

		//ctx.Server.Logger.Println("found user", cookie);
		callback(ctx);
	};

	if verb == "GET" {
		web.Get(route, handler);
		return;
	}

	web.Post(route, handler);
}

func apiWithValue(verb string, route string, callback func((* web.Context), string)) {
	// wrap our secure code around the caller's handler
	handler := func(ctx * web.Context, val string) {
		ctx.ContentType("json");

		// pull out the user data from the session
		cookie, success := ctx.GetSecureCookie("session");
		if !success {
			ctx.Server.Logger.Println("Session cookie is invalid");
			apiError(ctx, "Invalid session cookie");
			return;
		}

		if cookie == "" {
			apiError(ctx, "Corrupt user data");
			return;
		}

		callback(ctx, val);
	};

	if verb == "GET" {
		web.Get(route, handler);
		return;
	}

	web.Post(route, handler);
}

func RegisterRoutes() {
	// POST /login
	// Logs the user in
	web.Post("/login", func(ctx * web.Context) {
		ctx.SetHeader("Content-Type", "application/json", true);

		user := userValidate("mal@serenity.com", "alliance");
		dough := toJson(user);
		ctx.SetSecureCookie("session", string(dough), (60 * 15));

		//sessionAdd(user.Id, &user);

		ctx.Write(toJson(user));
	});

	// GET /rooms
	// Gets all the rooms
	api("POST", "/rooms", func(ctx * web.Context) {
		messages := []Message{getRoom()}
		fmt.Println(messages);

		response := toJson(messages);
		ctx.Write(response);

	});

	// GET /rooms/:id
	// Gets the room info
	apiWithValue("Get", "/rooms/([0-9]+)", func(ctx * web.Context, val string) {
		ctx.SetHeader("Content-Type", "application/json", true);
		id,_ := strconv.ParseInt(val, 0, 64);

		message := getRoom();
		message.Id = id;
		response := toJson(message);

		ctx.Write(response);
	});

	// GET /rooms/:id/users
	// gets the users for a room
	apiWithValue("GET", "/rooms/([0-9]+)/users", func(ctx * web.Context, val string) {
		ctx.SetHeader("Content-Type", "application/json", true);

		users := getUsers();
		response := toJson(users);
		ctx.Write(response);
	});

	// GET /rooms/$id/messaes
	// gets that last {n} messages for a room. 
	apiWithValue("GET", "/rooms/([0-9]+)/messages", func(ctx * web.Context, val string) {
		ctx.SetHeader("Content-Type", "application/json", true);

		ctx.Write(toJson(MESSAGE_STORE));
	});

	// POST /rooms/:id/messages
	// add a message to a room
	apiWithValue("POST", "/rooms/([0-9]+)/messages", func(ctx * web.Context, val string) {
		ctx.SetHeader("Content-Type", "application/json", true);

		message := Message{
			Name: "shut ya face, im here",
			Id: 3,
		};

		MESSAGE_STORE = append(MESSAGE_STORE, message);
		ctx.Write(toJson(message));
	});
}

func main() {
	RegisterRoutes();
    web.Run("0.0.0.0:9999")
}
