// Import the express library
const express = require("express");
// Create an instance of the express application
const app = express();

// Define a route for the root path
// This route will be called when the user visits the root path of the website
// res.send() is a method that sends a response to the client
// IMPORTANT: Route order matters! Express matches routes TOP TO BOTTOM.
// More specific routes should come BEFORE more general ones.

// route "/ab?c" is equivalent to "/abc" or "/ab" or "/ac"
// route "/ab+" is equivalent to "/ab" or "/abb" or "/abbb"
// route "/ab*b" is equivalent to "/ab" or "/abb" or "/abbb" or "/abbbbb"
// route "/ab{3}b" is equivalent to "/abbbb"
// route "/ab{3,5}b" is equivalent to "/abbbb" or "/abbbbb"
// route "/ab{3,}b" is equivalent to "/abbbb" or "/abbbbb" or "/abbbbbbb"
// route "/ab{3,5}b" is equivalent to "/abbbb" or "/abbbbb"
// route "/ab{3,5}b" is equivalent to "/abbbb" or "/abbbbb"
// route "/a(bc)+d" is equivalent to "/abcbcd" or "/abcbcbcd" or "/abcbcbcbcd"
// regex in route example: /user/[a-z0-9]+ ->
//  this will match any route that starts with /user and is followed by one or more lowercase letters or numbers

app.get("/", (req, res) => {
    console.log(req.query);
    console.log(req.params);
  res.send("<h1 style='color: pink;'>Hello World</h1>");
});



// Start the server on port 3000
app.listen(8080, () => {
  console.log("Server is running on port 8080");
});