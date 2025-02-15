'use strict';

module.exports = {
  register() {},

  bootstrap({ strapi }) {
    const { Server } = require("socket.io");
    const jwt = require("jsonwebtoken");

    if (!strapi.server) {
      console.error("❌ Strapi server is undefined!");
      return;
    }

    const io = new Server(strapi.server.httpServer, {
      cors: {
        origin: "http://localhost:5173", // Update for production
        methods: ["GET", "POST"],
      },
    });

    io.use((socket, next) => {
      const token = socket.handshake.auth.token;

      if (!token) {
        console.error("❌ No token provided");
        return next(new Error("Authentication error"));
      }

      try {
        const decoded = jwt.verify(
          token,
          process.env.JWT_SECRET || strapi.config.get('plugin.users-permissions.jwtSecret')
        );
        socket.data.user = decoded;
        next();
      } catch (err) {
        return next(new Error("❌ Invalid token"));
      }
    });

    io.on("connection", (socket) => {
      console.log("✅ New client connected:", socket.id);

      socket.on("message", (message) => {
        if (typeof message !== "object" || !message.text) {
          console.log("⚠️ Invalid message format:", message);
          return;
        }

        console.log(`📩 Received message from ${socket.id}:`, message);

        // Broadcast user message
        io.emit("message", {
          text: message.text,
          sender: message.sender,
        });

        // Send server echo after a delay (simulating server processing)
        setTimeout(() => {
          const serverMessage = {
            text: ` ${message.text}`,
            sender: "Server",
          };
          io.emit("message", serverMessage);
        }, 1000);
      });

      socket.on("disconnect", () => {
        console.log("❌ Client disconnected:", socket.id);
      });
    });

    strapi.io = io;
    console.log("🚀 WebSocket server running on ws://localhost:1337");
  },
};
