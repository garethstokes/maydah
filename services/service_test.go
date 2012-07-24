package main

import (
	"fmt"
	"testing"
	"web"
	"net/http"
	"net/http/httptest"
	"encoding/json"
)

//initialize the routes
func init() {
	RegisterRoutes();
}

func TestLogin(t * testing.T) {
	// Arrange
	recorder := httptest.NewRecorder()
	request, _ := http.NewRequest("POST", "/login", nil)

	// Act
	web.AdHoc(recorder, request)

	// Assert
	user := new(User)
	json.Unmarshal(recorder.Body.Bytes(), user)

	if user.Name != "Malcom Renyolds" {
		t.Error("Incorrect name returned");
	}

	if user.Email != "mal@serenity.com" {
		t.Error("Incorrect email returned");
	}

	if user.Id != 1 {
		t.Error("Incorrect id returned");
	}


	fmt.Println("Result", user)
}
