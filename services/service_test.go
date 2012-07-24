package main

import (
	"fmt"
	"testing"
	"web"
	"net/http"
	"net/http/httptest"
)

//initialize the routes
func init() {
	RegisterRoutes();
}

func TestHelloWorld(t * testing.T) {
	recorder := httptest.NewRecorder()
	request, _ := http.NewRequest("POST", "/login", nil)

	web.AdHoc(recorder, request)

	fmt.Println("Result", recorder.Body)
}
