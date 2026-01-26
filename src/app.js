// Import the express library
const express = require("express");
// Create an instance of the express application
const app = express();

// Define a route for the root path
// This route will be called when the user visits the root path of the website
// res.send() is a method that sends a response to the client
// IMPORTANT: Route order matters! Express matches routes TOP TO BOTTOM.
// More specific routes should come BEFORE more general ones.
app.get("/", (req, res) => {
  res.send("<h1 style='color: pink;'>Hello World</h1>");
});

app.post("/user", (req, res) => {
  res.send({
    name: "John",
    age: 20,
    email: "john@example.com"
  });
});
app.delete("/user", (req, res) => {
  res.send({
    message: "User deleted successfully"
  });
});

// Start the server on port 3000
app.listen(8080, () => {
  console.log("Server is running on port 8080");
});