const express = require("express");
const router = express.Router();

module.exports = (client) => {
  router.post("/", async (req, res) => {
    const name = req.body.name;
    const userId = req.body.userId;
    const userRole = req.body.role;

    console.log("userId", userId);
    console.log("userRole", userRole);

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
        image: "link/to/profile/image",
      };

      console.log("Creating user with role:", streamRole);

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
