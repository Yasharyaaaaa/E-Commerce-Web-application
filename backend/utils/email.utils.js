import transporter from "../config/nodemailer.config.js";

/**
 * Sends an email using Nodemailer.
 * @param {object} options - Email options (to, subject, text/html).
 */
export const sendEmail = async (options) => {
  const mailOptions = {
    from: `"${process.env.FROM_NAME}" <${process.env.FROM_EMAIL}>`,
    to: options.email,
    subject: options.subject,
    text: options.message,
    html: options.html,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log("Email sent: %s", info.messageId);
    return info;
  } catch (error) {
    console.error("Email send error:", error);
    throw new Error("Email could not be sent");
  }
};