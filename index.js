const express = require("express");
const dotenv = require("dotenv");
const http = require("http");
const { Server } = require("socket.io");
const { StreamClient } = require("@stream-io/node-sdk");

const app = express();
const PORT = 3000;
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});
dotenv.config();

const apiKey = `${process.env.STREAM_API_KEY}`;
const secret = `${process.env.STREAM_API_SECRET}`;
client = new StreamClient(apiKey, secret);

app.use(express.json());

app.post("/generateToken", async (req, res) => {
  const name = req.body.name;
  const userId = req.body.userId;

  if (!userId) {
    return res.status(400).json({ error: "Falta el userId en el body" });
  }

  try {
    const newUser = {
      id: userId,
      role: "guest",
      name: name,
      image: "link/to/profile/image",
    };
    await client.upsertUsers([newUser]);
    const token = client.generateUserToken({ user_id: userId });

    res.json({ token });
  } catch (error) {
    console.error("Error al generar el token:", error);
    res.status(500).json({ error: "Error generando el token" });
  }
});

io.on("connection", (socket) => {
  console.log("Un usuario se ha conectado");

  socket.on("message", (message) => {
    io.emit("message", message);
  });

  socket.on("joinDoctorRoom", (doctorId) => {
    socket.join(doctorId);
    console.log(`Doctor con ID ${doctorId} se ha unido a la sala ${doctorId}`);
  });

  socket.on("joinPatientRoom", (patientId) => {
    socket.join(patientId);
    console.log(
      `Patiente con ID ${patientId} se ha unido a la sala ${patientId}`
    );
  });

  socket.on("sendMessageToDoctor", ({ doctorId, message, patientId }) => {
    console.log(`Llamando al doctor ${doctorId}: ${message}`);
    io.to(doctorId).emit("message", message);
  });

  socket.on("sendMessageToPatient", ({ doctorId, message, patientId }) => {
    console.log(`Llamando al paciente ${doctorId}: ${message}`);
    io.to(patientId).emit("message", message);
  });

  socket.on("messageReceived", (id) => {
    io.emit("messageShow", id);
  });

  socket.on("disconnect", () => {
    console.log("Un usuario se ha desconectado");
  });
});

server.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
