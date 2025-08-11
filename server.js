const express = require("express");
const dotenv = require("dotenv");
const http = require("http");
const { Server } = require("socket.io");
const { StreamClient } = require("@stream-io/node-sdk");
const path = require("path");

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

app.get("/audio/:filename", (req, res) => {
  const filename = req.params.filename;
  const filePath = path.join(__dirname, filename);
  if (!require("fs").existsSync(filePath)) {
    return res.status(404).json({ error: "Archivo no encontrado" });
  }
  res.setHeader("Content-Type", "audio/mpeg");
  res.setHeader("Accept-Ranges", "bytes");
  res.setHeader("Cache-Control", "public, max-age=3600");

  res.sendFile(filePath);
});

const iaRoutes = require("./routes/ia");
const tokenRoutes = require("./routes/token");
const socketHandler = require("./sockets");

app.use("/ia", iaRoutes());
app.use("/token", tokenRoutes(client));
socketHandler(io);

server.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
