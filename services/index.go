package main

import (
    "web"
	"strconv"
	"encoding/json"
	"strings"
)

type ApiResponse struct {
	Ok bool
	Result interface{}
}

func init() {
	web.Config.CookieSecret = "I am a pole and so can you";
}

func apiError(ctx * web.Context, message string) {
	response := ApiResponse {
		Ok: false,
		Result: message,
	}
	ctx.Write(toJson(response));
}

func apiOk(result interface{}) (ApiResponse) {
	return ApiResponse {
		Ok: true,
		Result: result,
	}
}

func cookieModule(ctx * web.Context) {
	// Fail early if we are only logging on
	path := ctx.Request.URL.String()
	if strings.Contains("/login", path) {
		return
	}

	// Pull out the user data from the cookie
	// and set the session
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

	user := new(User)
	json.Unmarshal([]byte(cookie), user)
	ctx.User = (* user)

}

func jsonModule(ctx * web.Context) {
	// Lets set the response content type while 
	// we are here
	ctx.ContentType("json")
}

func RegisterRoutes() {
	// POST /login
	// Logs the user in
	web.Post("/login", func(ctx * web.Context) {
		ctx.SetHeader("Content-Type", "application/json", true);

		user, err := db.ValidateUser("Malcom Renyolds", "alliance")
		if err != nil {
			apiError(ctx, err.Error())
			return
		}

		dough := toJson(user);
		ctx.SetSecureCookie("session", string(dough), (60 * 15));

		ctx.Write(toJson(apiOk(user)));
	});

	// GET /rooms
	// Gets all the rooms
	web.Get("/rooms", func(ctx * web.Context) {
		user := ctx.User.(User)
		rooms, err := db.FindRoomsForUser(user)
		if err != nil {
			apiError(ctx, err.Error())
			return
		}

		ctx.Write(toJson(apiOk(rooms)));
	});

	// GET /rooms/:id/users
	// gets the users for a room
	web.Get("/rooms/([0-9]+)/users", func(ctx * web.Context, val string) {
		user := ctx.User.(User)

		roomid, err := strconv.ParseInt(val, 0, 32)
		if err != nil {
			apiError(ctx, err.Error())
			return
		}

		users, err := db.GetUsersForRoom(int(roomid), user)
		if err != nil {
			apiError(ctx, err.Error())
			return
		}

		ctx.Write(toJson(apiOk(users)));
	});

	// GET /rooms/$id/messaes
	// gets that last {n} messages for a room. 
	web.Get("/rooms/([0-9]+)/messages$", func(ctx * web.Context, val string) {
		ctx.SetHeader("Content-Type", "application/json", true);

		ctx.Write(toJson(MESSAGE_STORE));
	});

	// POST /rooms/:id/messages
	// add a message to a room
	web.Post("/rooms/([0-9]+)/messages$", func(ctx * web.Context, val string) {
		ctx.SetHeader("Content-Type", "application/json", true);

		message := Message{
			Name: "shut ya face, im here",
			Id: 3,
		};

		MESSAGE_STORE = append(MESSAGE_STORE, message);
		ctx.Write(toJson(message));
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

	// set up any modules we may need
	web.AddModule(cookieModule)
	web.AddModule(jsonModule)
}

func main() {
	RegisterRoutes();

	db.Open()
	defer db.Close()

    web.Run("0.0.0.0:9999")
}
