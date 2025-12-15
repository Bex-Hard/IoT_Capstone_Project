const { InfluxDB, Point } = require("@influxdata/influxdb-client");

const influx = new InfluxDB({
    url: process.env.INFLUX_URL,
    token: process.env.INFLUX_TOKEN,
});

const writeApi = influx.getWriteApi(
    process.env.INFLUX_ORG,
    process.env.INFLUX_BUCKET,
    "ns"
);

function salvarTelemetria(t) {
    const p = new Point("warehouse_env")
        .tag("deviceId", t.deviceId)
        .floatField("temp", t.temp)
        .floatField("hum", t.hum)
        .intField("ldr", t.ldr)
        .booleanField("alertTemp", t.alertTemp)
        .booleanField("alertHum", t.alertHum)
        .booleanField("alertAny", t.alertAny)
        .intField("ts", t.ts);

    writeApi.writePoint(p);
}

module.exports = { salvarTelemetria };
