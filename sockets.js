module.exports = (io) => {
  io.on("connection", (socket) => {
    console.log("Un usuario se ha conectado");

    socket.on("message", (message) => {
      io.emit("message", message);
    });

    socket.on("joinDoctorRoom", (doctorId) => {
      socket.join(doctorId);
      console.log(
        `Doctor con ID ${doctorId} se ha unido a la sala ${doctorId}`
      );
    });

    socket.on("joinPatientRoom", (patientId) => {
      socket.join(patientId);
      console.log(
        `Patiente con ID ${patientId} se ha unido a la sala ${patientId}`
      );
    });

    socket.on("sendMessageToDoctor", ({ doctorId, message, patientId }) => {
      console.log(`Llamando al doctor ${patientId}: ${message}`);
      io.to(doctorId).emit("message", message);
    });

    socket.on("sendMessageToPatient", ({ patientId, message, doctorId }) => {
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
};
