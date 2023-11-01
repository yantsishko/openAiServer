const express = require("express");
const OpenAI = require("openai");

const openai = new OpenAI();

// Initialize Express
const app = express();

// Create GET request
app.get("/", (req, res) => {
    res.send("Express on Vercel");
});

app.get("/health-check", (req, res) => {
    res.send("Server is Ok");
});

app.get("/question", async (req, res) => {
    if (req.query.text) {
        const completion = await openai.chat.completions.create({
            messages: [{ role: "system", content: req.query.text }],
            model: "gpt-4",
        });

        res.send(completion.choices[0]);
    } else {
        res.send("Not text value");
    }
});

// Initialize server
app.listen(5000, () => {
    console.log("Running on port 5000.");
});

module.exports = app;