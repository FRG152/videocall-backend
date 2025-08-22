const express = require("express");
const router = express.Router();

module.exports = (client) => {
  router.post("/", async (req, res) => {
    const name = req.body.name;
    const userId = req.body.userId;
    const userRole = req.body.role;

    if (!userId) {
      return res.status(400).json({ error: "Falta el userId en el body" });
    }

    try {
      let streamRole;
      if (userRole === "Doctor") {
        streamRole = "user";
      } else {
        streamRole = "guest";
      }

      const newUser = {
        id: userId,
        role: streamRole,
        name: name,
        image: "",
      };

      await client.upsertUsers([newUser]);
      const token = client.generateUserToken({ user_id: userId });

      res.json({ token });
    } catch (error) {
      console.error("Error al generar el token:", error);
      res.status(500).json({ error: "Error generando el token" });
    }
  });

  router.delete("/remove/:id", async (req, res) => {
    const userId = req.params.id;

    try {
      client.deleteUsers({ user_ids: [userId] });
      res.json({ status: 200, message: "Usuario eliminado correctamente" });
    } catch (error) {
      console.log("Error al eliminar el usuario", error);
      res.status(500).json({ error: "error al eliminar el usuario" });
    }
  });

  router.put("/restore/:id", async (req, res) => {
    const userId = req.params.id;

    try {
      client.restoreUsers({ user_ids: [userId] });
      res.json({ status: 200, message: "Usuario restaurado correctamente" });
    } catch (error) {
      console.log("Error al eliminar el usuario", error);
      res.status(500).json({ error: "error al restaurar el usuario" });
    }
  });

  return router;
};
