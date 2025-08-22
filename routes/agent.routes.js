const fs = require("fs");
const path = require("path");
const OpenAI = require("openai");

const express = require("express");
const router = express.Router();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const speechFile = path.resolve("./speech.mp3");

module.exports = () => {
  router.post("/agent", async (req, res) => {
    try {
      const { message } = req.body;

      if (!message) {
        return res.status(400).json({ error: "Falta el mensaje en el body" });
      }

      const mp3 = await openai.audio.speech.create({
        model: "gpt-4o-mini-tts",
        voice: "alloy",
        input: message,
        instructions:
          "Habla en castellano con un tono alegre, positivo y con un tono de voz femenino con mucha personalidad.",
        response_format: "mp3",
      });

      const buffer = Buffer.from(await mp3.arrayBuffer());
      await fs.promises.writeFile(speechFile, buffer);

      const baseUrl = `${req.protocol}://${req.get("host")}`;
      const audioUrl = `${baseUrl}/audio/speech.mp3`;

      res.json({
        success: true,
        audioUrl: audioUrl,
        message: "Audio generado exitosamente",
      });
    } catch (error) {
      console.error("Error al generar audio:", error);
      res.status(500).json({ error: "Error generando el audio" });
    }
  });

  return router;
};
