const express = require("express");
const morgan = require("morgan");
const Joi = require("joi");
require("dotenv").config();

const { salvarTelemetria } = require("./services/influxService");
const { enviarEmail } = require("./services/mailService");
const { formatarEmailAlerta } = require("./formatters/alertEmail");
const { podeEnviar } = require("./services/alertCooldown");

const app = express();

app.use(express.json({ limit: "100kb" }));
app.use(morgan("dev"));

// =========================
// ENV CHECK (evita erro bobo em runtime)
// =========================
if (!process.env.API_TOKEN) {
    console.warn("[WARN] API_TOKEN não definido no .env (todas as requests vão falhar com 401)");
}

if (!process.env.INFLUX_URL || !process.env.INFLUX_TOKEN || !process.env.INFLUX_ORG || !process.env.INFLUX_BUCKET) {
    console.warn("[WARN] Variáveis do Influx incompletas (INFLUX_URL, INFLUX_TOKEN, INFLUX_ORG, INFLUX_BUCKET).");
}

if (!process.env.MJ_APIKEY_PUBLIC || !process.env.MJ_APIKEY_PRIVATE || !process.env.MAILJET_EMAIL) {
    console.warn("[WARN] Variáveis do Mailjet incompletas (MJ_APIKEY_PUBLIC, MJ_APIKEY_PRIVATE, MAILJET_EMAIL).");
}

const ALERT_EMAIL_TO_RAW = process.env.ALERT_EMAIL_TO || "";
const ALERT_EMAIL_TO_LIST = ALERT_EMAIL_TO_RAW
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

const EMAIL_COOLDOWN_MS = Number(process.env.EMAIL_COOLDOWN_MS || 60_000);

// =========================
// AUTH
// =========================
function requireToken(req, res, next) {
    const header = req.headers.authorization || "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : null;

    if (!token || token !== process.env.API_TOKEN) {
        return res.status(401).json({ ok: false, error: "Unauthorized" });
    }
    next();
}

// =========================
// VALIDATION
// =========================
const telemetrySchema = Joi.object({
    deviceId: Joi.string().min(3).max(64).required(),
    temp: Joi.number().required(),
    hum: Joi.number().required(),
    ldr: Joi.number().integer().min(0).required(),
    alertTemp: Joi.boolean().required(),
    alertHum: Joi.boolean().required(),
    alertAny: Joi.boolean().required(),
    ts: Joi.number().integer().required(),
}).required();

// =========================
// ROUTES
// =========================
app.get("/health", (req, res) => {
    res.json({ ok: true, service: "iot-warehouse-backend" });
});

app.post("/telemetry", requireToken, async (req, res) => {
    const { error, value } = telemetrySchema.validate(req.body, {
        abortEarly: false,
        convert: true,
    });

    if (error) {
        return res.status(400).json({
            ok: false,
            error: "Invalid payload",
            details: error.details.map((d) => d.message),
        });
    }

    let sentEmail = false;

    try {
        // 1) InfluxDB (telemetria)
        salvarTelemetria(value);

        // 2) log
        console.log("[TELEMETRY]", value.alertAny ? "ALERT" : "OK", value);

        // 3) Email (somente alerta + cooldown)
        if (value.alertAny && ALERT_EMAIL_TO_LIST.length > 0) {
            if (podeEnviar(value.deviceId, EMAIL_COOLDOWN_MS)) {
                const { subject, text, html } = formatarEmailAlerta(value);

                // envia para todos os destinos
                for (const to of ALERT_EMAIL_TO_LIST) {
                    await enviarEmail({ to, subject, text, html });
                }

                sentEmail = true;
                console.log("[EMAIL] enviado para:", ALERT_EMAIL_TO_LIST.join(", "), "device:", value.deviceId);
            } else {
                console.log("[EMAIL] cooldown ativo (não enviado). device:", value.deviceId);
            }
        }

        return res.status(201).json({ ok: true, received: true, sentEmail });
    } catch (e) {
        console.error("Erro pipeline telemetry:", e);
        return res.status(500).json({ ok: false, error: "Internal error" });
    }
});

// =========================
// START
// =========================
const port = Number(process.env.PORT || 3000);
app.listen(port, () => {
    console.log(`Backend rodando em http://localhost:${port}`);
    console.log(`Health: http://localhost:${port}/health`);
});
