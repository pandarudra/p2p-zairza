const express = require("express");
const app = express();
const socketIO = require("socket.io");
const http = require("http");
const server = http.createServer(app);
const io = socketIO(server);
const path = require("path");

const users = new Map();

io.on("connection", (socket) => {
  console.log("New client connected with id = ", socket.id);

  users.set(socket.id, socket.id);

  socket.broadcast.emit("user:joined", socket.id);

  socket.on("outgoing:call", (data) => {
    const { fromOffer, to } = data;
    socket.to(to).emit("incoming:call", { from: socket.id, offer: fromOffer });
  });

  socket.on("answer:call", (data) => {
    const { ans, to } = data;
    socket.to(to).emit("inanswer:call", { from: socket.id, answer: ans }); // Corrected to send answer
  });

  socket.on("disconnect", () => {
    socket.broadcast.emit("user:left", socket.id);
    users.delete(socket.id);
  });
});

app.use(express.static(path.resolve(__dirname, "../client")));

app.get("/users", (req, res) => {
  return res.json(Array.from(users.keys()));
});

server.listen(3000, () => {
  console.log("Server is running on port 3000");
});
