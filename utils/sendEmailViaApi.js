import axios from 'axios';

const EMAIL_API_URL = import.meta.env.VITE_EMAIL_API_URL;
const API_KEY = import.meta.env.VITE_EMAIL_API_KEY;

// Debug: Log environment variables (be cautious in production)
console.log("EMAIL_API_URL =", EMAIL_API_URL);
console.log("EMAIL_API_KEY =", API_KEY ? '[REDACTED]' : 'Not Set'); // Optional: log value only if needed

/**
 * Sends email via PHP API (supports PDF attachment).
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
  type = 'otp',
  from = 'no-reply@zenithstudiogaya.in',
  reply_to = from,
  attachment
}) => {
  try {
    const formData = new FormData();
    formData.append('api_key', API_KEY);
    formData.append('to', to);
    formData.append('subject', subject);
    formData.append('message', message);
    formData.append('type', type);
    formData.append('from', from);
    formData.append('reply_to', reply_to);

    if (attachment instanceof File) {
      formData.append('attachment', attachment);
      console.log("Attachment added:", attachment.name);
    }

    console.log("Sending email via API with payload:", {
      to,
      subject,
      type,
      from,
      reply_to,
      hasAttachment: !!attachment
    });

    const response = await axios.post(EMAIL_API_URL, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });

    console.log("Email API response:", response.data);
    return response.data;
  } catch (error) {
    console.error("Email API Error:", error.response?.data || error.message);
    throw new Error("Failed to send email via PHP API");
  }
};
