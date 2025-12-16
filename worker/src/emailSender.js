const nodemailer = require('nodemailer');
require('dotenv').config();

// Create transporter using environment variables
const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_SMTP_HOST,
    port: parseInt(process.env.EMAIL_SMTP_PORT) || 587,
    secure: process.env.EMAIL_SMTP_SECURE === 'true', // true for 465, false for other ports
    auth: {
        user: process.env.EMAIL_SMTP_USER,
        pass: process.env.EMAIL_SMTP_PASS,
    },
});

/**
 * Send escalation email to human advisor.
 * @param {Object} payload - Contains jid, text, timestamp.
 */
async function sendEscalationEmail(payload) {
    const { jid, text, timestamp } = payload;
    const mailOptions = {
        from: process.env.EMAIL_FROM || 'no-reply@example.com',
        to: 'carlos.a.h.palma@gmail.com',
        subject: 'Escalación a asesor humano - WhatsApp Bot',
        text: `Se ha solicitado una escalación a asesor humano.

Cliente (JID): ${jid}
Mensaje recibido: ${text}
Hora: ${new Date(timestamp).toISOString()}`,
    };

    try {
        const info = await transporter.sendMail(mailOptions);
        console.log('Email sent, messageId:', info.messageId);
    } catch (err) {
        console.error('Error sending escalation email:', err);
    }
}

module.exports = { sendEscalationEmail };
