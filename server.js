const express = require("express");
const dotenv = require("dotenv");
const http = require("http");
const { Server } = require("socket.io");
const { StreamClient } = require("@stream-io/node-sdk");

const app = express();
const PORT = process.env.PORT || 3000;
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});
dotenv.config();

// Configuración de Stream
const apiKey = `${process.env.STREAM_API_KEY}`;
const secret = `${process.env.STREAM_API_SECRET}`;
client = new StreamClient(apiKey, secret);

app.use(express.json());

// Importar rutas y sockets
const tokenRoutes = require("./routes/token");
const socketHandler = require("./sockets");

app.use("/generateToken", tokenRoutes(client));
app.use("/deleteUser", tokenRoutes(client));
socketHandler(io);

server.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
