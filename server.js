const express = require("express");
const cors = require("cors");
const path = require("path");
const https = require("https");

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// Proxy endpoint
app.post("/chat", (req, res) => {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  console.log("API key present:", !!apiKey);
  console.log("API key length:", apiKey ? apiKey.length : 0);
  console.log("Request body keys:", Object.keys(req.body));

  if (!apiKey) {
    return res.status(500).json({ error: "ANTHROPIC_API_KEY environment variable not set" });
  }

  const body = JSON.stringify(req.body);

  const options = {
    hostname: "api.anthropic.com",
    path: "/v1/messages",
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Content-Length": Buffer.byteLength(body),
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01"
    }
  };

  const request = https.request(options, (response) => {
    let data = "";
    response.on("data", chunk => { data += chunk; });
    response.on("end", () => {
      console.log("Anthropic status:", response.statusCode);
      console.log("Anthropic response preview:", data.substring(0, 200));
      try {
        res.status(response.statusCode).json(JSON.parse(data));
      } catch(e) {
        console.log("Parse error:", e.message);
        res.status(500).json({ error: "Failed to parse response", raw: data.substring(0, 200) });
      }
    });
  });

  request.on("error", (err) => {
    console.log("Request error:", err.message);
    res.status(500).json({ error: err.message });
  });

  request.write(body);
  request.end();
});

// Health check — also shows if API key is set
app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    apiKeySet: !!process.env.ANTHROPIC_API_KEY,
    apiKeyLength: process.env.ANTHROPIC_API_KEY ? process.env.ANTHROPIC_API_KEY.length : 0
  });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log("GazeTalk server running on port " + PORT);
  console.log("API key configured: " + !!process.env.ANTHROPIC_API_KEY);
});
