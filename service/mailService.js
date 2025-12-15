const Mailjet = require("node-mailjet");

if (!process.env.MJ_APIKEY_PUBLIC || !process.env.MJ_APIKEY_PRIVATE || !process.env.MAILJET_EMAIL) {
    throw new Error("Mailjet env vars missing: MJ_APIKEY_PUBLIC / MJ_APIKEY_PRIVATE / MAILJET_EMAIL");
}

const mailjet = Mailjet.connect(
    process.env.MJ_APIKEY_PUBLIC,
    process.env.MJ_APIKEY_PRIVATE
);

const EMAIL_SEND = process.env.MAILJET_EMAIL;

async function enviarEmail({ to, subject, text, html }) {
    const { body } = await mailjet
        .post("send", { version: "v3.1" })
        .request({
            Messages: [
                {
                    From: { Email: EMAIL_SEND, Name: "Equipe Técnica" },
                    To: [{ Email: to }],
                    Subject: subject,
                    TextPart: text,
                    HTMLPart: html,
                },
            ],
        });

    const msg = body?.Messages?.[0];
    if (!msg || msg.Status !== "success") {
        throw new Error(`Falha ao enviar e-mail: ${JSON.stringify(msg)}`);
    }
    return msg;
}

module.exports = { enviarEmail };
