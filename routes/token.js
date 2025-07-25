const express = require("express");
const router = express.Router();

module.exports = (client) => {
  router.post("/", async (req, res) => {
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
  return router;
};
