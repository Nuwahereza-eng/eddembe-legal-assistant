import { Router } from "express";
import multer from "multer";
import { speechToText, textToSpeech } from "../services/sunbird.js";

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } });

export const speechRouter = Router();

speechRouter.post("/stt", upload.single("audio"), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No audio received." });
    const language = req.body.language === "en" ? "eng" : "lug";
    const text = await speechToText(req.file.buffer, req.file.mimetype, req.file.originalname || "audio.webm", language);
    res.json({ text });
  } catch (err) {
    next(err);
  }
});

speechRouter.post("/tts", async (req, res, next) => {
  try {
    const text = typeof req.body.text === "string" ? req.body.text.trim().slice(0, 2000) : "";
    if (!text) return res.status(400).json({ error: "No text to read." });
    const { audio, contentType } = await textToSpeech(text);
    res.type(contentType).send(audio);
  } catch (err) {
    next(err);
  }
});
