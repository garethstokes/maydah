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

	testuser := User{1, "Malcom Renyolds", "mal@serenity.com"}

	if property, ok := user.EqualTo(testuser); ok == false {
		t.Error("Incorrect response from server:", property);
	}
}
