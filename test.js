const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

io.on("connection", (socket) => {
  console.log("Un usuario se ha conectado");

  // Maneja el evento de escritura y lo envía a todos menos al remitente
  socket.on("typing", (data) => {
    socket.broadcast.emit("typing", data);
  });

  // Maneja mensajes generales
  socket.on("message", (message) => {
    io.emit("message", message); // Envía a todos los usuarios
  });

  // Cuando un doctor se conecta, se une a una sala específica usando su doctorId
  socket.on("joinDoctorRoom", (doctorId) => {
    socket.join(doctorId);
    console.log(`Doctor con ID ${doctorId} se ha unido a la sala ${doctorId}`);
  });

  // Cuando un paciente quiere enviar un mensaje a un doctor específico
  socket.on("sendMessageToDoctor", ({ doctorId, message }) => {
    console.log(`Enviando mensaje al doctor ${doctorId}: ${message}`);
    io.to(doctorId).emit("message", message); // Envía el mensaje solo a la sala del doctor correspondiente
  });

  // Maneja la desconexión del usuario
  socket.on("disconnect", () => {
    console.log("Un usuario se ha desconectado");
  });
});

const PORT = 3000;
server.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
