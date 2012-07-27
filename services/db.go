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
	options string
}

func (d database) createTables() {
	d.Execute("CREATE TABLE IF NOT EXISTS project(projectId SERIAL PRIMARY KEY, name TEXT)");
	d.Execute("CREATE TABLE IF NOT EXISTS person(userId SERIAL PRIMARY KEY, name TEXT, email TEXT, password TEXT, salt TEXT, hashIterations INTEGER, settings TEXT)");
	d.Execute("CREATE TABLE IF NOT EXISTS projectHasUser(projectId INTEGER, userId INTEGER)");
	d.Execute("CREATE TABLE IF NOT EXISTS room(roomId SERIAL PRIMARY KEY, name TEXT)");
	d.Execute("CREATE TABLE IF NOT EXISTS roomHasUser(roomId INTEGER, userId INTEGER, parentMessageId INTEGER)");
	d.Execute("CREATE TABLE IF NOT EXISTS message(messageId SERIAL PRIMARY KEY, roomId INTEGER, userId INTEGER, timestamp TIMESTAMP DEFAULT 'now', message TEXT)");
}

func (d * database) Options(o string) {
	d.options = o
}

func (d * database) Open() {
	if d.options == "" {
		d.options = "dbname=maydah user=maydah password=harry host=api.maydahapp.com"
	}

	fmt.Println("connecting:", d.options)
	connection, err := pgsql.Connect(d.options, pgsql.LogError)
	if err != nil {
		fmt.Println(err)
		return
	}

	d.connection = connection

	// lets make shit happen
	d.createTables()
}

func (d database) ResetTables() {
	// drop all the tables
	d.Execute("DROP TABLE IF EXISTS project;")
	d.Execute("DROP TABLE IF EXISTS projectHasUser;")
	d.Execute("DROP TABLE IF EXISTS room;")
	d.Execute("DROP TABLE IF EXISTS roomHasUser;")
	d.Execute("DROP TABLE IF EXISTS message;")

	// make all the things!
	d.createTables()
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

	statement, err := d.connection.Prepare(command, useridParameter)
	if err != nil {
		fmt.Println("statement error")
		fmt.Println(err)
		return rooms, err
	}
	defer statement.Close()

	// needs to be called after Prepare()
	useridParameter.SetValue(int(user.Id))

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

func (d * database) GetUsersForRoom(roomid int, user User) (users []User, err error) {
	users = []User{}

	command := "select u.userid, u.name, u.email from person u inner join roomhasuser r on u.userid = r.userid where r.roomid = @roomid;";

	useridParameter := pgsql.NewParameter("@roomid", pgsql.Integer)


	statement, err := d.connection.Prepare(command, useridParameter)
	if err != nil {
		fmt.Println("statement error")
		fmt.Println(err)
		return users, err
	}
	defer statement.Close()

	useridParameter.SetValue(roomid)

	results, err := statement.Query()
	if err != nil {
		fmt.Println("query error")
		fmt.Println(err)
		return users, err
	}
	defer results.Close()

	for {
		hasData, _ := results.FetchNext()

		if (hasData) {
			user := new(User)
			results.Scan(&user.Id, &user.Name, &user.Email)
			users = append(users, *user)
			continue
		}

		break
	}

	// this is kinda hacky, should really
	// put this filter in the db query itself
	for _, u := range users {
		if _, ok := user.EqualTo(u); ok {
			// the user is in the set
			// and we can return
			return users, nil
		}
	}

	// we never found the user in the result
	// which means he aint got permission to
	// see the result
	users = []User{}
	return users, nil
}

func (d * database) GetLastMessagesForRoom(roomid int) (messages []Message, err error) {
	command := "select messageid, roomid, userid, message from message where roomid = @roomid order by messageid limit 50;";

	useridParameter := pgsql.NewParameter("@roomid", pgsql.Integer)

	statement, err := d.connection.Prepare(command, useridParameter)
	if err != nil {
		fmt.Println("statement error")
		fmt.Println(err)
		return messages, err
	}
	defer statement.Close()

	// needs to be called after Prepare()
	useridParameter.SetValue(roomid)

	results, err := statement.Query()
	if err != nil {
		fmt.Println("query error")
		fmt.Println(err)
		return messages, err
	}
	defer results.Close()

	messages = make([]Message, 0)
	for {
		hasData, _ := results.FetchNext()

		if (hasData) {
			message := new(Message)
			results.Scan(&message.Id, &message.RoomId, &message.UserId, &message.Message)
			messages = append(messages, *message)
			continue
		}

		break
	}

	return messages, nil
}

func (d * database) SaveMessage(user User, roomid int, message string) (error) {
	command := "insert into message (roomid, userid, message) values (@roomid, @userid, @message);";

	useridParameter := pgsql.NewParameter("@roomid", pgsql.Integer)
	roomidParameter := pgsql.NewParameter("@userid", pgsql.Integer)
	messageParameter := pgsql.NewParameter("@message", pgsql.Varchar)

	statement, err := d.connection.Prepare(command, useridParameter, roomidParameter, messageParameter)
	if err != nil {
		fmt.Println("statement error")
		fmt.Println(err)
		return err
	}
	defer statement.Close()

	// needs to be called after Prepare()
	useridParameter.SetValue(int(user.Id))
	roomidParameter.SetValue(roomid)
	messageParameter.SetValue(message)

	results, err := statement.Query()
	if err != nil {
		fmt.Println("query error")
		fmt.Println(err)
		return err
	}
	defer results.Close()

	return nil
}

var db = new(database)
