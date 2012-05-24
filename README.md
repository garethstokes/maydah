maydah
======

group chat and collaboration. 


Services
--------

 * GET  /rooms 
   - Gets all the rooms
 * GET  /rooms/$id
   - Get room info
 * GET  /rooms/$id/users
   - Get all users in a room 
 * GET  /rooms/$id/messages
   - Get last N messages for a room
 * GET  /rooms/$id/messages/before/$lastMessageId
   - Get last N messages since lastMessageId for a room 
 * POST /rooms/$id/users
   - Add a user to a room
 * POST /rooms/$id/messages
   - Add a message to a room


Apps
-----

  * history
  * whiteboard
  * profile/settings
  * media center
  * document store integration (e.g. google docs)


Models
------

project <*--*> user <*--*> room <--*> message
