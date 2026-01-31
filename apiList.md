#DevTinder

POST /signUp
POST /login
POST /logout

GET /profile/view
PATCH /profile/edit
POST /profile/password

POST /request/send/interested/:userId
POST /request/send/ingored/:userId
POST /request/review/accepted/:requestId
POST /request/review/ingored/:requestId

GET /connections
GET /requests/received
GET /feed - Gets you the profiles of the others users on platform

Status: ingore , interested, accpeted, rejected
