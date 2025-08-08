module.exports = (io) => {
  const usersConectados = {};
  const llamadasActivas = new Map();

  io.on("connection", (socket) => {
    console.log("Un usuario se ha conectado con el ID:", socket.id);

    socket.on("register", ({ id, nombre }) => {
      usersConectados[id] = socket.id;
      socket.userId = id;
      socket.nombre = nombre;
      console.log(`✅ ${nombre} (ID: ${id}) conectado`);

      const usuariosDisponibles = Object.keys(usersConectados)
        .filter((userId) => userId !== id)
        .map((userId) => ({
          id: userId,
          nombre: socket.nombre || "Usuario",
          online: true,
        }));

      socket.emit("usuarios_disponibles", usuariosDisponibles);
      socket.broadcast.emit("usuario_conectado", {
        id: id,
        nombre: nombre,
        online: true,
      });
    });

    // Iniciar llamada con Stream.io
    socket.on(
      "iniciar_llamada",
      ({ destinatarioId, tipo = "video", llamadaId }) => {
        const destSocketId = usersConectados[destinatarioId];

        if (!destSocketId) {
          socket.emit("error_llamada", {
            mensaje: "El usuario no está disponible",
          });
          return;
        }

        if (llamadasActivas.has(destinatarioId)) {
          socket.emit("error_llamada", {
            mensaje: "El usuario está en otra llamada",
          });
          return;
        }

        const llamada = {
          id: llamadaId,
          iniciador: {
            id: socket.userId,
            nombre: socket.nombre,
            socketId: socket.id,
          },
          destinatario: {
            id: destinatarioId,
            socketId: destSocketId,
          },
          tipo: tipo,
          estado: "llamando",
          timestamp: Date.now(),
        };

        llamadasActivas.set(socket.userId, llamada);
        llamadasActivas.set(destinatarioId, llamada);

        io.to(destSocketId).emit("llamada_entrante", {
          llamadaId: llamadaId,
          iniciador: {
            id: socket.userId,
            nombre: socket.nombre,
          },
          tipo: tipo,
        });

        socket.emit("llamada_iniciada", {
          llamadaId: llamadaId,
          destinatario: {
            id: destinatarioId,
          },
        });

        console.log(`📞 ${socket.nombre} está llamando a ${destinatarioId}`);
      }
    );

    // Resto de eventos igual que antes...
    socket.on("aceptar_llamada", ({ llamadaId }) => {
      const llamada = Array.from(llamadasActivas.values()).find(
        (l) => l.id === llamadaId && l.destinatario.id === socket.userId
      );

      if (!llamada) {
        socket.emit("error_llamada", {
          mensaje: "Llamada no encontrada",
        });
        return;
      }

      llamada.estado = "activa";
      llamada.timestampRespuesta = Date.now();

      io.to(llamada.iniciador.socketId).emit("llamada_aceptada", {
        llamadaId: llamadaId,
        destinatario: {
          id: socket.userId,
          nombre: socket.nombre,
        },
      });

      console.log(
        `✅ ${socket.nombre} aceptó la llamada de ${llamada.iniciador.nombre}`
      );
    });

    socket.on("rechazar_llamada", ({ llamadaId }) => {
      const llamada = Array.from(llamadasActivas.values()).find(
        (l) => l.id === llamadaId && l.destinatario.id === socket.userId
      );

      if (!llamada) {
        socket.emit("error_llamada", {
          mensaje: "Llamada no encontrada",
        });
        return;
      }

      io.to(llamada.iniciador.socketId).emit("llamada_rechazada", {
        llamadaId: llamadaId,
        destinatario: {
          id: socket.userId,
          nombre: socket.nombre,
        },
      });

      llamadasActivas.delete(llamada.iniciador.id);
      llamadasActivas.delete(llamada.destinatario.id);

      console.log(
        `❌ ${socket.nombre} rechazó la llamada de ${llamada.iniciador.nombre}`
      );
    });

    socket.on("colgar_llamada", ({ llamadaId }) => {
      const llamada = Array.from(llamadasActivas.values()).find(
        (l) =>
          l.id === llamadaId &&
          (l.iniciador.id === socket.userId ||
            l.destinatario.id === socket.userId)
      );

      if (!llamada) {
        socket.emit("error_llamada", {
          mensaje: "Llamada no encontrada",
        });
        return;
      }

      const otroParticipanteId =
        llamada.iniciador.id === socket.userId
          ? llamada.destinatario.id
          : llamada.iniciador.id;

      const otroSocketId = usersConectados[otroParticipanteId];

      if (otroSocketId) {
        io.to(otroSocketId).emit("llamada_terminada", {
          llamadaId: llamadaId,
          terminadaPor: {
            id: socket.userId,
            nombre: socket.nombre,
          },
        });
      }

      llamadasActivas.delete(llamada.iniciador.id);
      llamadasActivas.delete(llamada.destinatario.id);

      console.log(`📞 ${socket.nombre} colgó la llamada`);
    });

    socket.on("disconnect", () => {
      if (socket.userId) {
        const llamadasUsuario = Array.from(llamadasActivas.values()).filter(
          (l) =>
            l.iniciador.id === socket.userId ||
            l.destinatario.id === socket.userId
        );

        llamadasUsuario.forEach((llamada) => {
          const otroParticipanteId =
            llamada.iniciador.id === socket.userId
              ? llamada.destinatario.id
              : llamada.iniciador.id;

          const otroSocketId = usersConectados[otroParticipanteId];

          if (otroSocketId) {
            io.to(otroSocketId).emit("llamada_terminada", {
              llamadaId: llamada.id,
              terminadaPor: {
                id: socket.userId,
                nombre: socket.nombre,
              },
              razon: "desconexion",
            });
          }

          llamadasActivas.delete(llamada.iniciador.id);
          llamadasActivas.delete(llamada.destinatario.id);
        });

        delete usersConectados[socket.userId];
        socket.broadcast.emit("usuario_desconectado", {
          id: socket.userId,
          nombre: socket.nombre,
        });

        console.log(`❌ ${socket.nombre} desconectado`);
      }
    });
  });
};
