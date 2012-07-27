package main

import (
	"testing"
	"web"
	"net/http"
	"net/http/httptest"
	"encoding/json"
	"fmt"
	"io"
	"bytes"
)

func fromJson(t * testing.T, b []byte) (interface{}) {
	res := new(ApiResponse)
	json.Unmarshal(b, res)

	// this fails the single responsibility
	// rule but it fits in nice here for now
	if res.Ok == false {
		t.Fatal("response not ok", res)
	}

	return res.Result
}

func login(t * testing.T) (User, string) {
	recorder := httptest.NewRecorder()
	request, _ := http.NewRequest("POST", "/login", nil)

	// make request
	web.AdHoc(recorder, request)
	cookie := recorder.Header().Get("Set-Cookie")

	result := fromJson(t, recorder.Body.Bytes())

	var data = map[string] interface{}{}
	data = result.(map[string] interface{})

	// put the results into an struct
	user := new(User)
	user.Name = data["Name"].(string)
	user.Email = data["Email"].(string)
	user.Id = int64(data["Id"].(float64))

	return *user, cookie
}

func createTestSchema() {
	// Persons
	db.Execute("INSERT INTO person (name, email, password) VALUES ('Malcom Renyolds', 'mal@serenity.com', 'alliance');")
	db.Execute("INSERT INTO person (name, email, password) VALUES ('Jayne Cobb', 'jayne@serenity.com', 'guns');")
	db.Execute("INSERT INTO person (name, email, password) VALUES ('Kaylee Frye', 'kaylee@serenity.com', 'engines');")
	db.Execute("INSERT INTO person (name, email, password) VALUES ('Inara Serra', 'inara@serenity.com', 'malcom');")
	db.Execute("INSERT INTO person (name, email, password) VALUES ('Zoe Washburne', 'zoe@serenity.com', 'hoban');")
	db.Execute("INSERT INTO person (name, email, password) VALUES ('Hoban Washburne', 'hoban@serenity.com', 'zoe');")

	// Rooms
	db.Execute("INSERT INTO room (name) VALUES ('Joss wheedons fan club');")

	// Relations
	db.Execute("INSERT INTO roomhasuser (roomid, userid) VALUES (1, 1);")
	db.Execute("INSERT INTO roomhasuser (roomid, userid) VALUES (1, 2);")
	db.Execute("INSERT INTO roomhasuser (roomid, userid) VALUES (1, 3);")
	db.Execute("INSERT INTO roomhasuser (roomid, userid) VALUES (1, 4);")
	db.Execute("INSERT INTO roomhasuser (roomid, userid) VALUES (1, 5);")
	db.Execute("INSERT INTO roomhasuser (roomid, userid) VALUES (1, 6);")

	// Messages
	db.Execute("INSERT INTO message (roomid, userid, message) VALUES (1, 1, 'roll call!');")
}

//initialize the routes
func init() {
	RegisterRoutes();

	db.Options("dbname=maydah_test user=garrydanger")

	db.Open()
	defer db.Close()

	db.ResetTables()
	createTestSchema()
}

func TestLogin(t * testing.T) {
	db.Open()
	defer db.Close()

	fmt.Println("Login")
	// Arrange
	testuser := User{1, "Malcom Renyolds", "mal@serenity.com"}

	// Act
	user, cookie := login(t)

	// Assert
	if property, ok := user.EqualTo(testuser); ok == false {
		t.Log(user)
		t.Log(testuser)
		t.Error("Incorrect response from server", property);
	}

	if cookie == "" {
		t.Error("session cookie not being returned")
	}
}

func TestGetRooms(t * testing.T) {
	db.Open()
	defer db.Close()

	fmt.Println("GetRooms")

	// Arrange
	recorder := httptest.NewRecorder()
	request, _ := http.NewRequest("GET", "/rooms", nil)
	request.Header = http.Header{}

	// Act
	_, cookie := login(t)
	request.Header.Set("Cookie", cookie)
	web.AdHoc(recorder, request)
	result := fromJson(t, recorder.Body.Bytes())

	// Assert
	if length := len(result.([]interface{})); length != 1 {
		t.Error(result)
		t.Fatal("incorrect length returned:", length)
	}
}

func TestGetUsersForRoom(t * testing.T) {
	db.Open()
	defer db.Close()

	fmt.Println("GetRooms")

	// Arrange
	recorder := httptest.NewRecorder()
	request, _ := http.NewRequest("GET", "/rooms/1/users", nil)
	request.Header = http.Header{}

	// Act
	_, cookie := login(t)
	request.Header.Set("Cookie", cookie)
	web.AdHoc(recorder, request)
	result := fromJson(t, recorder.Body.Bytes())

	// Assert
	if length := len(result.([]interface{})); length != 6 {
		t.Error(result)
		t.Fatal("incorrect length returned:", length)
	}

	for _, user := range result.([]interface{}) {
		fmt.Println(user)
	}
}

/*
func TestHandler(t * testing.T) {
	// Arrange.
	web.ResetModules()

	web.Get("/handler/test", func(ctx * web.Context) {
		message := ctx.User.(string)
		ctx.WriteString(message)
	})

	web.AddModule(func(ctx * web.Context) {
		ctx.User = "Hello human"
	})

	recorder := httptest.NewRecorder()
	request, _ := http.NewRequest("GET", "/handler/test", nil)

	// Act.
	web.AdHoc(recorder, request)

	// Assert.
	message := string(recorder.Body.Bytes())
	if message != "Hello human" {
		t.Fatal("incorrect message returned, expecting 'Hello human' got:", message)
	}
}
*/

func TestGetMessages(t * testing.T) {
	db.Open()
	defer db.Close()

	fmt.Println("GetMessages")

	// Arrange
	recorder := httptest.NewRecorder()
	request, _ := http.NewRequest("GET", "/rooms/1/messages", nil)
	request.Header = http.Header{}

	// Act
	_, cookie := login(t)
	request.Header.Set("Cookie", cookie)
	web.AdHoc(recorder, request)
	result := fromJson(t, recorder.Body.Bytes())

	// Assert
	for _, message := range result.([]interface{}) {
		fmt.Println(message)
	}
}

type nopCloser struct {
    io.Reader
}

func (nopCloser) Close() error { return nil }

func getNopCloser(buf *bytes.Buffer) nopCloser {
    return nopCloser{buf}
}

func TestSaveMessages(t * testing.T) {
	db.Open()
	defer db.Close()

	fmt.Println("SaveMessages")

	// Arrange
	recorder := httptest.NewRecorder()
	request, _ := http.NewRequest("POST", "/rooms/1/messages", nil)
	request.Header = http.Header{}
	request.Body = getNopCloser(bytes.NewBufferString("this is a new message"))

	// Act
	_, cookie := login(t)
	request.Header.Set("Cookie", cookie)
	web.AdHoc(recorder, request)
	result := fromJson(t, recorder.Body.Bytes())

	// Assert
	for _, message := range result.([]interface{}) {
		fmt.Println(message)
	}
}
