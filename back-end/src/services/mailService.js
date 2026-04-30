const nodemailer = require("nodemailer");
const {
  SMTP_HOST,
  SMTP_PORT,
  SMTP_SECURE,
  SMTP_USER,
  SMTP_PASS,
  SMTP_FROM_NAME,
  SMTP_FROM_EMAIL,
} = require("../config/env");

let transporter = null;

const isMailConfigured = () =>
  Boolean(SMTP_HOST && SMTP_PORT && SMTP_USER && SMTP_PASS && SMTP_FROM_EMAIL);

const assertMailConfigured = () => {
  if (!isMailConfigured()) {
    throw new Error("Chưa cấu hình SMTP. Vui lòng thêm biến môi trường để gửi email.");
  }
};

const getTransporter = () => {
  assertMailConfigured();

  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: SMTP_SECURE,
      auth: {
        user: SMTP_USER,
        pass: SMTP_PASS,
      },
    });
  }

  return transporter;
};

const buildFromAddress = () => {
  if (!SMTP_FROM_NAME) {
    return SMTP_FROM_EMAIL;
  }

  const safeName = SMTP_FROM_NAME.replace(/"/g, "");
  return `"${safeName}" <${SMTP_FROM_EMAIL}>`;
};

const sendMail = async ({ to, subject, text, html }) => {
  const transport = getTransporter();

  return transport.sendMail({
    from: buildFromAddress(),
    to,
    subject,
    text,
    html,
  });
};

module.exports = {
  isMailConfigured,
  sendMail,
};
