module.exports = (io) => {
  const connectedUsers = new Map();

  io.on("connection", (socket) => {
    console.log("Un usuario se ha conectado con el ID:", socket.id);

    socket.on("register", (userId) => {
      socket.userId = userId;
      connectedUsers.set(userId, socket);
      console.log(`Usuario ${userId} conectado`);
      console.log("Usuarios conectados:", Array.from(connectedUsers.keys()));
    });

    socket.on("private_message", (data) => {
      const { id, doctorName, patientName, meetingId } = data;

      const targetSocket = connectedUsers.get(id);

      if (targetSocket) {
        targetSocket.emit("receive_private_message", {
          from: socket.userId,
          meetingId: meetingId,
          doctorName: doctorName,
          patientName: patientName,
        });
      } else {
        console.log(`Usuario ${id} no está conectado`);
      }
    });

    socket.on("disconnect", () => {
      if (socket.userId) {
        connectedUsers.delete(socket.userId);
        console.log(`Usuario ${socket.userId} desconectado`);
        console.log(
          "Usuarios conectados restantes:",
          Array.from(connectedUsers.keys())
        );
      }
    });
  });
};
