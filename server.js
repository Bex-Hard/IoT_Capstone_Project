const express = require("express");
const morgan = require("morgan");
const Joi = require("joi");
require("dotenv").config();
console.log("PORT:", process.env.PORT);
console.log("API_TOKEN:", process.env.API_TOKEN);


const app = express();

app.use(express.json({ limit: "100kb" }));
app.use(morgan("dev"));

// --- Segurança simples: token no header ---
function requireToken(req, res, next) {
    const header = req.headers.authorization || "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : null;

    if (!token || token !== process.env.API_TOKEN) {
        return res.status(401).json({ ok: false, error: "Unauthorized" });
    }
    next();
}

// --- Schema do payload vindo do ESP32 ---
const telemetrySchema = Joi.object({
    deviceId: Joi.string().min(3).max(64).required(),
    temp: Joi.number().required(),
    hum: Joi.number().required(),
    ldr: Joi.number().integer().min(0).required(),
    alertTemp: Joi.boolean().required(),
    alertHum: Joi.boolean().required(),
    alertAny: Joi.boolean().required(),
    ts: Joi.number().integer().required()
}).required();

app.get("/health", (req, res) => {
    res.json({ ok: true, service: "iot-warehouse-backend" });
});

app.post("/telemetry", requireToken, (req, res) => {
    const { error, value } = telemetrySchema.validate(req.body, {
        abortEarly: false,
        convert: true
    });

    if (error) {
        return res.status(400).json({
            ok: false,
            error: "Invalid payload",
            details: error.details.map((d) => d.message)
        });
    }

    // Aqui é onde depois entra: gravar no InfluxDB + enviar e-mail.
    // Por enquanto: log bonito + resposta simples.
    const alertMsg = value.alertAny ? "ALERT" : "OK";
    console.log("[TELEMETRY]", alertMsg, value);

    res.status(201).json({ ok: true, received: true });
});

const port = Number(process.env.PORT || 3000);
app.listen(port, () => {
    console.log(`Backend rodando em http://localhost:${port}`);
    console.log(`Health: http://localhost:${port}/health`);
});