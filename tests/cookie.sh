#!/bin/sh

echo "authenticate the user"
rm -f auth.cookie

curl -XPOST localhost:9999/login -c auth.cookie

echo "\nnow get rooms to see if the session worked"
curl -XPOST localhost:9999/rooms -b auth.cookie
