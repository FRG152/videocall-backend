# Sistema de Llamadas de Video con Stream.io para React Native

Este backend implementa un sistema completo de llamadas de video usando Socket.IO y Stream.io Video SDK. Guía paso a paso para implementar en React Native con las herramientas de Stream.io.

## 📱 Configuración con Stream.io

### Dependencias ya Instaladas ✅

```json
{
  "@stream-io/react-native-webrtc": "^118.1.0",
  "@stream-io/video-react-native-sdk": "^0.9.5"
}
```

### Configuración Adicional

```bash
# Socket.IO para señalización
npm install socket.io-client

# Permisos
npm install react-native-permissions
```

## 🚀 Implementación con Stream.io

### Paso 1: Configurar Stream.io Video Client

```javascript
// services/streamVideoService.js
import { StreamVideo } from "@stream-io/video-react-native-sdk";

class StreamVideoService {
  constructor() {
    this.streamVideo = null;
    this.call = null;
  }

  // Inicializar Stream Video Client
  initialize(apiKey, token) {
    this.streamVideo = new StreamVideo({
      apiKey: apiKey,
      token: token,
      user: {
        id: token.user_id,
        name: token.user_name || "Usuario",
      },
    });

    return this.streamVideo;
  }

  // Crear o unirse a una llamada
  async joinCall(callId, callType = "default") {
    try {
      this.call = this.streamVideo.call(callType, callId);
      await this.call.join({ create: true });

      console.log("Unido a la llamada:", callId);
      return this.call;
    } catch (error) {
      console.error("Error uniéndose a la llamada:", error);
      throw error;
    }
  }

  // Salir de la llamada
  async leaveCall() {
    if (this.call) {
      await this.call.leave();
      this.call = null;
    }
  }

  // Obtener el call actual
  getCurrentCall() {
    return this.call;
  }

  // Limpiar recursos
  cleanup() {
    this.leaveCall();
    if (this.streamVideo) {
      this.streamVideo.disconnectUser();
      this.streamVideo = null;
    }
  }
}

export default new StreamVideoService();
```

### Paso 2: Servicio de Socket.IO para Señalización

```javascript
// services/socketService.js
import io from "socket.io-client";

class SocketService {
  constructor() {
    this.socket = null;
    this.isConnected = false;
  }

  connect(userId, userName) {
    this.socket = io("http://localhost:3000", {
      transports: ["websocket"],
      forceNew: true,
    });

    this.socket.on("connect", () => {
      console.log("Conectado al servidor de señalización");
      this.isConnected = true;

      // Registrar usuario
      this.socket.emit("register", { id: userId, nombre: userName });
    });

    this.socket.on("disconnect", () => {
      console.log("Desconectado del servidor de señalización");
      this.isConnected = false;
    });

    return this.socket;
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
    }
  }

  getSocket() {
    return this.socket;
  }
}

export default new SocketService();
```

### Paso 3: Componente Principal con Stream.io

```javascript
// components/VideoCall.js
import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  FlatList,
} from "react-native";
import {
  StreamVideo,
  CallControls,
  CallTopView,
  CallContent,
  CallParticipantsList,
  CallParticipantsGrid,
} from "@stream-io/video-react-native-sdk";
import socketService from "../services/socketService";
import streamVideoService from "../services/streamVideoService";

const VideoCall = () => {
  const [usuarios, setUsuarios] = useState([]);
  const [llamadaActiva, setLlamadaActiva] = useState(null);
  const [estadoLlamada, setEstadoLlamada] = useState("disponible");
  const [streamVideo, setStreamVideo] = useState(null);
  const [call, setCall] = useState(null);
  const socket = useRef(null);

  // Configuración de Stream.io
  const STREAM_API_KEY = "tu_api_key_aqui";
  const STREAM_TOKEN = "tu_token_aqui"; // Obtener del backend

  useEffect(() => {
    initializeApp();
    return () => cleanup();
  }, []);

  const initializeApp = async () => {
    try {
      // Conectar socket para señalización
      socket.current = socketService.connect("user123", "Mi Usuario");

      // Inicializar Stream Video
      const videoClient = streamVideoService.initialize(
        STREAM_API_KEY,
        STREAM_TOKEN
      );
      setStreamVideo(videoClient);

      // Configurar eventos de socket
      setupSocketEvents();
    } catch (error) {
      Alert.alert("Error", "No se pudo inicializar la aplicación");
    }
  };

  const setupSocketEvents = () => {
    // Usuarios disponibles
    socket.current.on("usuarios_disponibles", (usuarios) => {
      setUsuarios(usuarios);
    });

    // Llamada entrante
    socket.current.on("llamada_entrante", (data) => {
      Alert.alert(
        "Llamada Entrante",
        `${data.iniciador.nombre} te está llamando`,
        [
          {
            text: "Rechazar",
            onPress: () => rechazarLlamada(data.llamadaId),
            style: "cancel",
          },
          {
            text: "Aceptar",
            onPress: () => aceptarLlamada(data.llamadaId),
          },
        ]
      );
    });

    // Llamada aceptada
    socket.current.on("llamada_aceptada", (data) => {
      setEstadoLlamada("activa");
      unirseALlamada(data.llamadaId);
    });

    // Llamada rechazada
    socket.current.on("llamada_rechazada", (data) => {
      Alert.alert(
        "Llamada Rechazada",
        `${data.destinatario.nombre} rechazó la llamada`
      );
      setEstadoLlamada("disponible");
    });

    // Llamada terminada
    socket.current.on("llamada_terminada", (data) => {
      Alert.alert("Llamada Terminada", "La llamada ha terminado");
      terminarLlamada();
    });
  };

  const llamarUsuario = async (destinatarioId) => {
    try {
      setEstadoLlamada("llamando");
      const llamadaId = `call_${Date.now()}`;

      socket.current.emit("iniciar_llamada", {
        destinatarioId: destinatarioId,
        tipo: "video",
        llamadaId: llamadaId,
      });

      // Crear llamada en Stream.io
      const streamCall = await streamVideoService.joinCall(llamadaId);
      setCall(streamCall);
      setLlamadaActiva(llamadaId);
    } catch (error) {
      Alert.alert("Error", "No se pudo iniciar la llamada");
      setEstadoLlamada("disponible");
    }
  };

  const aceptarLlamada = async (llamadaId) => {
    try {
      setEstadoLlamada("activa");
      socket.current.emit("aceptar_llamada", { llamadaId: llamadaId });

      // Unirse a la llamada existente en Stream.io
      const streamCall = await streamVideoService.joinCall(llamadaId);
      setCall(streamCall);
      setLlamadaActiva(llamadaId);
    } catch (error) {
      Alert.alert("Error", "No se pudo aceptar la llamada");
      setEstadoLlamada("disponible");
    }
  };

  const rechazarLlamada = (llamadaId) => {
    socket.current.emit("rechazar_llamada", { llamadaId: llamadaId });
    setEstadoLlamada("disponible");
  };

  const colgarLlamada = () => {
    if (llamadaActiva) {
      socket.current.emit("colgar_llamada", { llamadaId: llamadaActiva });
    }
    terminarLlamada();
  };

  const terminarLlamada = async () => {
    await streamVideoService.leaveCall();
    setCall(null);
    setLlamadaActiva(null);
    setEstadoLlamada("disponible");
  };

  const unirseALlamada = async (llamadaId) => {
    try {
      const streamCall = await streamVideoService.joinCall(llamadaId);
      setCall(streamCall);
      setLlamadaActiva(llamadaId);
    } catch (error) {
      Alert.alert("Error", "No se pudo unir a la llamada");
    }
  };

  const cleanup = () => {
    streamVideoService.cleanup();
    socketService.disconnect();
  };

  const renderUsuario = ({ item }) => (
    <View style={styles.usuarioItem}>
      <Text style={styles.usuarioNombre}>{item.nombre}</Text>
      <Text style={styles.usuarioEstado}>
        {item.enLlamada ? "En llamada" : "Disponible"}
      </Text>
      <TouchableOpacity
        style={[styles.btnLlamar, item.enLlamada && styles.btnLlamarDisabled]}
        onPress={() => !item.enLlamada && llamarUsuario(item.id)}
        disabled={item.enLlamada}
      >
        <Text style={styles.btnLlamarTexto}>Llamar</Text>
      </TouchableOpacity>
    </View>
  );

  // Renderizar llamada activa con Stream.io
  if (estadoLlamada === "activa" && call) {
    return (
      <StreamVideo client={streamVideo}>
        <View style={styles.callContainer}>
          <CallTopView />
          <CallContent>
            <CallParticipantsGrid />
          </CallContent>
          <CallControls onHangupCall={colgarLlamada} />
        </View>
      </StreamVideo>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.titulo}>Usuarios Disponibles</Text>
      <Text style={styles.estado}>Estado: {estadoLlamada}</Text>

      <FlatList
        data={usuarios}
        renderItem={renderUsuario}
        keyExtractor={(item) => item.id}
        style={styles.lista}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  callContainer: {
    flex: 1,
  },
  titulo: {
    fontSize: 24,
    fontWeight: "bold",
    textAlign: "center",
    marginVertical: 20,
  },
  estado: {
    fontSize: 16,
    textAlign: "center",
    marginBottom: 20,
    color: "#666",
  },
  lista: {
    flex: 1,
  },
  usuarioItem: {
    backgroundColor: "white",
    padding: 15,
    marginHorizontal: 15,
    marginVertical: 5,
    borderRadius: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  usuarioNombre: {
    fontSize: 16,
    fontWeight: "500",
  },
  usuarioEstado: {
    fontSize: 14,
    color: "#666",
  },
  btnLlamar: {
    backgroundColor: "#007AFF",
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
  },
  btnLlamarDisabled: {
    backgroundColor: "#ccc",
  },
  btnLlamarTexto: {
    color: "white",
    fontWeight: "500",
  },
});

export default VideoCall;
```

### Paso 4: Configurar App.js con Stream.io Provider

```javascript
// App.js
import React from "react";
import { SafeAreaView, StatusBar } from "react-native";
import { StreamVideoProvider } from "@stream-io/video-react-native-sdk";
import VideoCall from "./components/VideoCall";

const App = () => {
  return (
    <SafeAreaView style={{ flex: 1 }}>
      <StatusBar barStyle="dark-content" />
      <StreamVideoProvider>
        <VideoCall />
      </StreamVideoProvider>
    </SafeAreaView>
  );
};

export default App;
```

### Paso 5: Obtener Token de Stream.io desde el Backend

```javascript
// services/tokenService.js
class TokenService {
  async getStreamToken(userId, userName) {
    try {
      const response = await fetch("http://localhost:3000/token", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: userId,
          name: userName,
        }),
      });

      const data = await response.json();
      return data.token;
    } catch (error) {
      console.error("Error obteniendo token:", error);
      throw error;
    }
  }
}

export default new TokenService();
```

## 🔧 Configuración del Backend

### Actualizar el Backend para Manejar Llamadas con Stream.io

```javascript
// sockets.js - Actualización para Stream.io
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
```

## 📱 Ventajas de usar Stream.io

- ✅ **UI Completa**: Componentes listos para usar
- ✅ **WebRTC Optimizado**: Manejo automático de conexiones P2P
- ✅ **Funcionalidades Avanzadas**: Grabación, transcripción, etc.
- ✅ **Escalabilidad**: Servidores TURN automáticos
- ✅ **Menos Código**: No necesitas manejar WebRTC manualmente
- ✅ **Soporte**: Documentación y soporte oficial

## 🚨 Configuración Importante

1. **API Key**: Obtén tu API key de Stream.io
2. **Tokens**: Genera tokens de usuario desde tu backend
3. **Permisos**: Configura permisos de cámara y micrófono
4. **URL del Servidor**: Actualiza la URL de tu backend

## 🎯 Flujo de Llamadas

1. **Usuario A** llama a **Usuario B** → Se crea llamada en Stream.io
2. **Usuario B** recibe notificación → Se une a la llamada existente
3. **Stream.io** maneja toda la comunicación WebRTC
4. **Socket.IO** solo maneja la señalización inicial

Esta implementación es mucho más robusta y fácil de mantener que la versión manual de WebRTC.
