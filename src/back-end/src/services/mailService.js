const axios = require("axios");
const nodemailer = require("nodemailer");
const {
  SMTP_HOST,
  SMTP_PORT,
  SMTP_SECURE,
  SMTP_USER,
  SMTP_PASS,
  SMTP_FROM_NAME,
  SMTP_FROM_EMAIL,
  SMTP_CONNECTION_TIMEOUT,
  RESEND_API_KEY,
  RESEND_API_URL,
  RESEND_FROM_NAME,
  RESEND_FROM_EMAIL,
  RESEND_TIMEOUT,
} = require("../config/env");

let transporter = null;

const isResendConfigured = () => Boolean(RESEND_API_KEY && RESEND_FROM_EMAIL);

const isSmtpConfigured = () =>
  Boolean(SMTP_HOST && SMTP_PORT && SMTP_USER && SMTP_PASS && SMTP_FROM_EMAIL);

const isMailConfigured = () => isResendConfigured() || isSmtpConfigured();

const assertMailConfigured = () => {
  if (!isMailConfigured()) {
    throw new Error(
      "Chưa cấu hình email. Vui lòng thêm RESEND_API_KEY/RESEND_FROM_EMAIL hoặc cấu hình SMTP.",
    );
  }
};

const buildFromAddress = (name, email) => {
  if (!name) {
    return email;
  }

  const safeName = name.replace(/"/g, "");
  return `"${safeName}" <${email}>`;
};

const getTransporter = () => {
  assertMailConfigured();

  if (!isSmtpConfigured()) {
    throw new Error("Chưa cấu hình SMTP để gửi email.");
  }

  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: SMTP_SECURE,
      connectionTimeout: SMTP_CONNECTION_TIMEOUT,
      greetingTimeout: SMTP_CONNECTION_TIMEOUT,
      socketTimeout: SMTP_CONNECTION_TIMEOUT,
      auth: {
        user: SMTP_USER,
        pass: SMTP_PASS,
      },
    });
  }

  return transporter;
};

const sendSmtpMail = async ({ to, subject, text, html }) => {
  const transport = getTransporter();

  return transport.sendMail({
    from: buildFromAddress(SMTP_FROM_NAME, SMTP_FROM_EMAIL),
    to,
    subject,
    text,
    html,
  });
};

const sendResendMail = async ({ to, subject, text, html }) => {
  if (!isResendConfigured()) {
    throw new Error("Thiếu RESEND_API_KEY hoặc RESEND_FROM_EMAIL để gửi email qua Resend.");
  }

  const response = await axios.post(
    RESEND_API_URL,
    {
      from: buildFromAddress(RESEND_FROM_NAME, RESEND_FROM_EMAIL),
      to: Array.isArray(to) ? to : [to],
      subject,
      text,
      html,
    },
    {
      timeout: RESEND_TIMEOUT,
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
    },
  );

  return response.data;
};

const sendMail = async ({ to, subject, text, html }) => {
  assertMailConfigured();

  if (isResendConfigured()) {
    return sendResendMail({ to, subject, text, html });
  }

  return sendSmtpMail({ to, subject, text, html });
};

const getMailErrorMessage = (error) => {
  const responseData = error.response?.data;

  if (typeof responseData?.message === "string") {
    return responseData.message;
  }

  if (typeof responseData?.error === "string") {
    return responseData.error;
  }

  if (typeof responseData === "string") {
    return responseData;
  }

  return error.message || "Không thể gửi email";
};

const sendMailSafely = async (mailOptions) => {
  try {
    await sendMail(mailOptions);
    return { success: true, errorMessage: "" };
  } catch (error) {
    const errorMessage = getMailErrorMessage(error);
    console.error("Send Mail Error:", {
      to: mailOptions?.to,
      provider: isResendConfigured() ? "resend" : "smtp",
      message: errorMessage,
      status: error.response?.status,
      code: error.code,
      command: error.command,
    });
    return { success: false, errorMessage };
  }
};

module.exports = {
  isMailConfigured,
  sendMail,
  sendMailSafely,
};
