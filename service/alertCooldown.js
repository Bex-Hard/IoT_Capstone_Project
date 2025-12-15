const lastSentByDevice = new Map();

function podeEnviar(deviceId, cooldownMs) {
  const now = Date.now();
  const last = lastSentByDevice.get(deviceId) || 0;
  if (now - last < cooldownMs) return false;
  lastSentByDevice.set(deviceId, now);
  return true;
}

module.exports = { podeEnviar };
