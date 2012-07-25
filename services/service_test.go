package main

import (
	"testing"
	"web"
	"net/http"
	"net/http/httptest"
	"encoding/json"
	"fmt"
)

func fromJson(t * testing.T, b []byte) (interface{}) {
	res := new(ApiResponse)
	json.Unmarshal(b, res)

	if res.Ok == false {
		t.Fatal("response not ok")
	}

	return res.Result
}

func login(t * testing.T) (User, string) {
	recorder := httptest.NewRecorder()
	request, _ := http.NewRequest("POST", "/login", nil)

	// Act
	web.AdHoc(recorder, request)
	cookie := recorder.Header().Get("Set-Cookie")

	user := new(User)
	result := fromJson(t, recorder.Body.Bytes())

	var data = map[string] interface{}{}
	data = result.(map[string] interface{})

	user.Name = data["Name"].(string)
	user.Email = data["Email"].(string)
	user.Id = int64(data["Id"].(float64))

	return *user, cookie
}

//initialize the routes
func init() {
	RegisterRoutes();
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
	/*
	for _, item := range result.([]interface{}) {
		room := item.(map[string]interface{})
		fmt.Println(room["Name"])
	}
	*/
}
