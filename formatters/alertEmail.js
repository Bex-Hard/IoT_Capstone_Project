function formatarEmailAlerta(t) {
    const quando = new Date().toISOString();
    const flags = [t.alertTemp ? "TEMP" : null, t.alertHum ? "HUM" : null].filter(Boolean);
    const severidade = t.alertAny ? (flags.join("+") || "ALERTA") : "OK";

    const subject = `[IoT] ${severidade} - ${t.deviceId}`;

    const text =
        `ALERTA IoT (${quando})

Dispositivo: ${t.deviceId}
Temperatura: ${t.temp} °C
Umidade: ${t.hum} %
LDR: ${t.ldr}

Flags:
- alertTemp: ${t.alertTemp}
- alertHum: ${t.alertHum}
- alertAny: ${t.alertAny}

TS (segundos desde boot): ${t.ts}
`;

    const safe = (s) => String(s).replace(/</g, "&lt;").replace(/>/g, "&gt;");

    const html = `
    <p><strong>ALERTA IoT</strong> <small>(${quando})</small></p>
    <p><strong>Dispositivo:</strong> ${safe(t.deviceId)}</p>
    <ul>
      <li><strong>Temperatura:</strong> ${safe(t.temp)} °C</li>
      <li><strong>Umidade:</strong> ${safe(t.hum)} %</li>
      <li><strong>LDR:</strong> ${safe(t.ldr)}</li>
    </ul>
    <p><strong>Flags:</strong></p>
    <ul>
      <li>alertTemp: ${safe(t.alertTemp)}</li>
      <li>alertHum: ${safe(t.alertHum)}</li>
      <li>alertAny: ${safe(t.alertAny)}</li>
    </ul>
    <p><strong>TS:</strong> ${safe(t.ts)}</p>
  `;

    return { subject, text, html };
}

module.exports = { formatarEmailAlerta };
