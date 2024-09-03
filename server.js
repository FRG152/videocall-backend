const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

var myPatientId = "";

io.on("connection", (socket) => {
  console.log("Un usuario se ha conectado");

  socket.on("typing", (data) => {
    socket.broadcast.emit("typing", data);
  });

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
    myPatientId = patientId;
  });

  socket.on("sendMessageToPatient", ({ doctorId, message, patientId }) => {
    console.log(`Llamando al paciente ${doctorId}: ${message}`);
    io.to(patientId).emit("message", message);
    myPatientId = patientId;
  });

  socket.on("messageReceived", ({ doctorId }) => {
    io.emit("messageShow", { myPatientId, doctorId });
  });

  socket.on("disconnect", () => {
    console.log("Un usuario se ha desconectado");
  });
});

const PORT = 3000;
server.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
