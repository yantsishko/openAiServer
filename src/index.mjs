import express from "express";
import { aiApp } from "./ai.mjs";
import { voiceApp } from "./voice-synth.mjs";

const logger = console;
// Initialize Express
export const app = express();

app.use(express.json());

// Create GET request
app.get("/", (req, res) => {
    res.send("Express on Vercel");
});

app.get("/health-check", (req, res) => {
    res.send("Server is Ok");
});

app.use("/ai", aiApp);
app.use("/voice", voiceApp);

app.use((err, req, res, next) => {
    logger.error(err.stack);
    res.status(500);
    res.json({ error: err.toString() });
});

// Initialize server
app.listen(process.env.PORT || 3000, () => {
    logger.log("Running on port 3000.");
});
