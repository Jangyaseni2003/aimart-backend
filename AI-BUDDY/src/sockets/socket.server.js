const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");
const cookie = require("cookie");
const agent = require("../agent/agent");

async function initSocketServer(httpServer) {
  const io = new Server(httpServer, {});

  io.use((socket, next) => {
    const cookies = socket.handshake.headers?.cookie;
    const { token: cookieToken } = cookies ? cookie.parse(cookies) : {};
    const token = socket.handshake.auth?.token || cookieToken;
    if (!token) {
      return next(new Error("Authentication error: No token provided"));
    }
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.user = decoded;
      socket.token = token;
      next();
    } catch (error) {
      next(new Error("Authentication error: Invalid token"));
    }
  });

  io.on("connection", (socket) => {
    console.log("Socket user:", socket.user);
    console.log("A user connected:", socket.id);
    console.log(socket.token);

    socket.on("message", async (data) => {
      console.log("Received message from", socket.user.username, ":", data);
      try {
        const agentResponse = await agent.invoke(
          {
            messages: [
              {
                role: "user",
                content: data,
              },
            ],
          },
          {
            metadata: {
              token: socket.token,
            },
          }
        );
        const lastMessage =
          agentResponse.messages[agentResponse.messages.length - 1];

        socket.emit("message", lastMessage.content);
      } catch (error) {
        console.error("Agent error:", error);
        socket.emit(
          "message",
          "Sorry, I ran into an error handling that request. Please try again."
        );
      }
    });
  });
}

module.exports = { initSocketServer };
