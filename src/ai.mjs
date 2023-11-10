import express from "express";
import OpenAI from "openai";
import { errorWrapper } from "./utils.mjs";
import { cache } from "./voice-cache.mjs";

const logger = console;

const openai = new OpenAI();
export const aiApp = express();

const model = "gpt-4-1106-preview";

aiApp.get(
    "/question",
    errorWrapper("get answer", async (req, res) => {
        if (req.query.text) {
            const completion = await openai.chat.completions.create({
                messages: [{ role: "system", content: req.query.text }],
                model
            });

            res.send(completion.choices[0]);
        } else {
            res.status(400);
            res.send("No text value");
        }
    })
);

aiApp.get(
    "/voiceQuestion",
    errorWrapper("get answer", async (req, res) => {
        const {
            query: { text, voiceId }
        } = req;
        if (text) {
            const completion = await openai.chat.completions.create({
                messages: [{ role: "system", content: text }],
                model
            });

            logger.log("Got answer from AI: ");

            const {
                message: { content }
            } = completion.choices[0];

            const { marks, hash } = await cache.generate({ phrase: content, type: "mp3", useMarks: true, voiceId });

            const result = {
                answer: completion.choices[0],
                marks,
                link: `${req.protocol}://${req.get("host")}/voice/stream/${hash}`
            };
            logger.log("Voice generated");

            res.json(result);
        } else {
            res.status(400);
            res.send("No text value");
        }
    })
);
