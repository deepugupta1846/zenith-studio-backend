import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config(); // Ensure .env variables are loaded if not already

const RESEND_API_KEY = process.env.RESEND_API_KEY;

/**
 * Sends email via Resend API (supports PDF attachment).
 * 
 * @param {Object} params 
 * @param {string} params.to - Recipient email
 * @param {string} params.subject - Email subject
 * @param {string} params.message - Email message
 * @param {string} [params.type] - Email type ('otp', 'transactional', etc.)
 * @param {string} [params.from] - Sender email
 * @param {string} [params.reply_to] - Reply-to email
 * @param {File}   [params.attachment] - PDF File object (from input[type=file])
 */
export const sendEmailViaApi = async ({
  to,
  subject,
  message,
  html,
  type = 'otp',
  from = 'no-reply@zenithstudiogaya.in',
  reply_to = from,
  attachment
}) => {
  try {
    const emailData = {
      from: from,
      to: to,
      subject: subject,
      html: html || message,
      reply_to: reply_to
    };

    // Handle attachment if provided
    if (attachment instanceof File) {
      const buffer = await attachment.arrayBuffer();
      emailData.attachments = [{
        filename: attachment.name,
        content: Buffer.from(buffer)
      }];
    }

    const response = await axios.post('https://api.resend.com/emails', emailData, {
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    return response.data;
  } catch (error) {
    console.error("❌ Resend Email API Error:", error.response?.data || error.message);
    throw new Error("Failed to send email via Resend API");
  }
};
