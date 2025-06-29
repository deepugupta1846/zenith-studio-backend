import axios from 'axios';

const EMAIL_API_URL = process.env.EMAIL_API_URL || 'https://techvestors.in/api/SMTP/send.php';
const API_KEY = process.env.EMAIL_API_KEY;

export const sendEmailViaApi = async ({
  to,
  subject,
  message,
  type = 'otp',
  from = 'no-reply@zenithstudiogaya.in',
  reply_to = from
}) => {
  try {
    const response = await axios.post(EMAIL_API_URL, {
      api_key: API_KEY,
      to,
      subject,
      message,
      type,
      from,
      reply_to
    });
    return response.data;
  } catch (error) {
    console.error("Email API Error:", error.response?.data || error.message);
    throw new Error("Failed to send email via PHP API");
  }
};
