import express from "express";
import { cache, VoiceCache } from "./voice-cache.mjs";
import { errorWrapper, typeExt } from "./utils.mjs";
import { pollySynth, speechMarks } from "./polly-module.mjs";

const logger = console;

export const voiceApp = express();

const checkParams = (req, res, next) => {
    if (req.method === "POST") {
        const { phrase, type } = req.body;
        let message;
        if (!phrase) {
            message = "Phrase is empty";
        }
        if (type && !["mp3", "pcm", "ogg_vorbis", "wav"].includes(type)) {
            message = "Wrong output format (type)";
        }
        if (message) {
            logger.error(message);
            res.status(400).send(message);
        } else {
            next();
        }
    } else {
        next();
    }
};

voiceApp.use(checkParams);

voiceApp.post(
    "/stream/",
    errorWrapper("load phrase", async (req, res) => {
        const { phrase, type, filename = "voice", voiceId } = req.body;
        const { stream, contentType, size } = await pollySynth({ phrase, type, voiceId });
        const fileName = `${filename}.${typeExt[contentType]}`;
        res.set({
            "Content-Type": contentType,
            "Content-Disposition": `attachment; filename=${fileName}`
        });
        logger.log(`Stream phrase to file: ${fileName} Size: ${size}`);
        res.status(200);
        res.end(Buffer.from(stream, "base64"));
    })
);

voiceApp.get(
    "/stream/:hash",
    errorWrapper("load phrase", async (req, res) => {
        const { hash } = req.params;
        const { filename = "voice" } = req.query;

        const voiceDataObject = cache.get(hash);

        if (!voiceDataObject) {
            res.status(404);
            res.end("Voice data not found");
            return;
        }

        const [{ stream, contentType, size }] = voiceDataObject;
        const fileName = `${filename}.${typeExt[contentType]}`;
        res.set({
            "Content-Type": contentType,
            "Content-Disposition": `attachment; filename=${fileName}`
        });
        logger.log(`Stream phrase to file: ${fileName} Size: ${size}`);
        res.status(200);
        res.end(Buffer.from(stream, "base64"));
    })
);

voiceApp.post(
    "/marks/",
    errorWrapper("make marks", async (req, res) => {
        const { phrase, filename = "voice", voiceId } = req.body;
        const { stream, contentType, size } = await speechMarks({ phrase, voiceId });
        const fileName = `${filename}.${typeExt[contentType]}`;
        res.set({
            "Content-Type": contentType,
            "Content-Disposition": `attachment; filename=${fileName}`
        });
        logger.log(`Stream phrase to file: ${fileName} Size: ${size}`);
        res.status(200);
        res.end(Buffer.from(stream, "utf-8"));
    })
);

voiceApp.post(
    "/generate/",
    errorWrapper("generate phrase", async (req, res) => {
        const { phrase, type = "voice", useMarks, voiceId } = req.body;
        const { voice, marks, hash } = await cache.generate({ phrase, type, useMarks, voiceId });
        const { size } = voice;

        const result = {
            marks,
            link: `${req.protocol}://${req.get("host")}/voice/stream/${hash}`
        };

        res.set({
            "Content-Type": "application/json"
        });
        logger.log(`Phrase stored to cache. Size of voice data: ${size}`);
        res.status(200);
        res.json(result);
    })
);
