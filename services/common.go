package main

import (
	"fmt"
	"encoding/json"
)

func toJson(item interface{}) []byte {
	b, err := json.Marshal(item)
	if err != nil {
		fmt.Println("error:", err)
	}
	return b;
}
