# What was learned?

## External libraries (and purpose)

| Library         | Purpose |
|----------------|--------|
| **express**    | Web framework for building the API: routing, middleware, request/response handling. |
| **mongoose**   | MongoDB ODM: connect to MongoDB, define schemas/models, run queries and validations. |
| **bcrypt**     | Hash and compare passwords securely; never store plain-text passwords. |
| **jsonwebtoken** | Create (sign) and verify JWT tokens for authentication and protected routes. |
| **cookie-parser** | Parse the `Cookie` header and expose cookies as `req.cookies`. |
| **validator**  | Validate and sanitize input (e.g. email format, strong password rules). |

---

- Routing based on endpoints in separate files using Express Router.
- Middlewares to validate user or token before allowing access.
- Validation using the validator library (email, strong password, etc.).
- Schema/model creation using Mongoose.
- Database connection to MongoDB Cloud (Atlas).
- Express handling routing and DB connection on startup.
- Cookies for session/token storage; valid users can access protected APIs.
- JWT token creation and verification for login and protected routes.
- Token and session expiration (e.g. cookie expiry, JWT expiry).
- Logout API (clear token/session).
- Utils folder with separate validation functions, called from API handlers for request validation.
- Reset password API
- Update profile information
