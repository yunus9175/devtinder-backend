// Import the express library
const express = require("express");
const { adminAuth } = require("./middlewares/auth");
// Create an instance of the express application
const app = express();

// Define a route for the root path
// This route will be called when the user visits the root path of the website
// res.send() is a method that sends a response to the client
// IMPORTANT: Route order matters! Express matches routes TOP TO BOTTOM.
// More specific routes should come BEFORE more general ones.
// next() is a function that calls the next middleware function
// next() is not a function that sends a response to the client
// next() is not a function that calls the next middleware function

// app.use("/admin", adminAuth); is a middleware that checks if the user is authenticated
// all "/admin" routes will be checked by the adminAuth middleware

// all "/admin/getAllUsers" routes will be checked by the adminAuth middleware
// adminAuth middleware runs first, then the route handler
app.get('/admin/getAllUsers', adminAuth, (req, res) => {
    res.send("Admin All Users");
});


// Start the server on port 3000
app.listen(8080, () => {
  console.log("Server is running on port 8080");
});