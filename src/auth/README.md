# Auth

Simple cookie-based authentication.

## Password Hashes

We're using scrpyt for hashing passwords. It's good practice to salt your password hashes to prevent rainbow table attacks. You can generate a salt for yourself with the following command:

```sh
node -e 'console.log(require("crypto").randomBytes(32).toString("base64"))'
```

On login, we use `secure-compare` to prevent timing attacks.

## Cookies

We set two cookies.

- `authToken` is just a UUID stored in a database. It's set to httpOnly so that it is not available via JavaScript preventing cross-site scripting (XSS) attacks.
- `userId` is the current logged in user's id. This is available on the client and lets the client know what the current user is.

Logging out is simply a matter of deleting these cookies and/or deleting the authToken from the database.
