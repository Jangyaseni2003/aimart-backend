require("dotenv").config();
const { app, aiBuddyProxy } = require("./src/app");

const PORT = process.env.PORT || 8000;

const server = app.listen(PORT, () => {
  console.log("Gateway service listening on port " + PORT);
});

// Socket.IO upgrade requests bypass Express's normal request handling, so the
// proxy needs to hook into the underlying HTTP server's 'upgrade' event too.
server.on("upgrade", aiBuddyProxy.upgrade);
