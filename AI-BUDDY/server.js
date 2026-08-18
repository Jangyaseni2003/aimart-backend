require("dotenv").config();
const app = require("./src/app");

const http = require("http");
const { initSocketServer } = require("./src/sockets/socket.server");

const httpServer = http.createServer(app);
initSocketServer(httpServer);

const PORT = process.env.PORT || 3005;
httpServer.listen(PORT, () => {
  console.log(`AI-BUDDY service running on port ${PORT}`);
});
