/*
	db.exec("CREATE TABLE IF NOT EXISTS project(projectId SERIAL PRIMARY KEY, name TEXT)");
	db.exec("CREATE TABLE IF NOT EXISTS user(userId SERIAL PRIMARY KEY, name TEXT, email TEXT, password TEXT, salt TEXT, hashIterations INTEGER, settings TEXT)");
	db.exec("CREATE TABLE IF NOT EXISTS projectHasUser(projectId INTEGER, userId INTEGER)");
	db.exec("CREATE TABLE IF NOT EXISTS room(roomId INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT)");
	db.exec("CREATE TABLE IF NOT EXISTS roomHasUser(roomId INTEGER, userId INTEGER, parentMessageId INTEGER)");
	db.exec("CREATE TABLE IF NOT EXISTS message(messageId INTEGER PRIMARY KEY AUTOINCREMENT, roomId INTEGER, userId INTEGER, timestamp INTEGER, message TEXT)");
*/
package main

import (
	"github.com/lxn/go-pgsql"
	"fmt"
)

type database struct {
	connection * pgsql.Conn
}

func (d * database) Open() {
	connection, err := pgsql.Connect("dbname=maydah user=garrydanger", pgsql.LogError)
	if err != nil {
		fmt.Println(err)
		return
	}

	d.connection = connection

	// lets make shit happen
	d.Execute("CREATE TABLE IF NOT EXISTS project(projectId SERIAL PRIMARY KEY, name TEXT)");
	d.Execute("CREATE TABLE IF NOT EXISTS person(userId SERIAL PRIMARY KEY, name TEXT, email TEXT, password TEXT, salt TEXT, hashIterations INTEGER, settings TEXT)");
	d.Execute("CREATE TABLE IF NOT EXISTS projectHasUser(projectId INTEGER, userId INTEGER)");
	d.Execute("CREATE TABLE IF NOT EXISTS room(roomId SERIAL PRIMARY KEY, name TEXT)");
	d.Execute("CREATE TABLE IF NOT EXISTS roomHasUser(roomId INTEGER, userId INTEGER, parentMessageId INTEGER)");
	d.Execute("CREATE TABLE IF NOT EXISTS message(messageId SERIAL PRIMARY KEY, roomId INTEGER, userId INTEGER, timestamp INTEGER, message TEXT)");
}

func (d * database) Close() {
	d.connection.Close();
}

func (d * database) Execute(sql string) {
	rs, _ := d.connection.Query(sql)
	defer rs.Close()
}

func (d * database) ValidateUser(name string, pass string) (user * User, err error) {
	command := "SELECT userid, name, email FROM person WHERE name = @name AND password = @pass;"
	nameParameter := pgsql.NewParameter("@name", pgsql.Varchar)
	passParameter := pgsql.NewParameter("@pass", pgsql.Varchar)

	nameParameter.SetValue(name)
	passParameter.SetValue(pass)

	statement, err := d.connection.Prepare(command, nameParameter, passParameter)
	if err != nil {
		fmt.Println(err)
		return user, err
	}
	defer statement.Close()

	results, err := statement.Query()
	if err != nil {
		fmt.Println(err)
		return user, err
	}
	defer results.Close()

	hasData, _ := results.FetchNext()
	if hasData {
		user = new(User)
		results.Scan(&user.Id, &user.Name, &user.Email)
	}

	return user, nil
}

func (d * database) FindRoomsForUser(user User) (rooms []Room, err error) {
	command := "select r.roomid, r.name from room r inner join roomhasuser ru on r.roomid = ru.roomid where ru.userid = @userid;";

	useridParameter := pgsql.NewParameter("@userid", pgsql.Integer)
	useridParameter.SetValue(1)

	statement, err := d.connection.Prepare(command, useridParameter)
	if err != nil {
		fmt.Println("statement error")
		fmt.Println(err)
		return rooms, err
	}
	defer statement.Close()

	results, err := statement.Query()
	if err != nil {
		fmt.Println("query error")
		fmt.Println(err)
		return rooms, err
	}
	defer results.Close()

	rooms = make([]Room, 0)
	for {
		hasData, _ := results.FetchNext()

		if (hasData) {
			room := new(Room)
			results.Scan(&room.Id, &room.Name)
			rooms = append(rooms, *room)
			continue
		}

		break
	}

	return rooms, nil
}

var db = new(database)
