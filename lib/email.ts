import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME || "APFCO AI Training";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "";

export interface SendActivationEmailInput {
  to: string;
  fullName: string;
  password: string;
}

export interface SendEmailResult {
  success: boolean;
  error?: string;
}

export async function sendActivationEmail({
  to,
  fullName,
  password,
}: SendActivationEmailInput): Promise<SendEmailResult> {
  const loginUrl = APP_URL ? `${APP_URL}/login` : "";

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 480px; margin: 0 auto; color: #1f2937;">
      <h2 style="color: #15803d;">Tài khoản của bạn đã được kích hoạt</h2>
      <p>Chào ${fullName},</p>
      <p>Tài khoản của bạn tại <strong>${APP_NAME}</strong> đã được kích hoạt. Vui lòng dùng thông tin đăng nhập sau:</p>
      <div style="background: #f3f4f6; border-radius: 8px; padding: 16px; margin: 16px 0; font-family: monospace; font-size: 14px;">
        <p style="margin: 4px 0;">Email: <strong>${to}</strong></p>
        <p style="margin: 4px 0;">Mật khẩu: <strong>${password}</strong></p>
      </div>
      ${loginUrl ? `<p><a href="${loginUrl}" style="display: inline-block; background: #16a34a; color: #fff; text-decoration: none; padding: 10px 20px; border-radius: 6px;">Đăng nhập ngay</a></p>` : ""}
      <p style="font-size: 13px; color: #6b7280;">Vì lý do bảo mật, bạn nên đổi mật khẩu sau lần đăng nhập đầu tiên.</p>
    </div>
  `;

  const text = [
    `Chào ${fullName},`,
    ``,
    `Tài khoản của bạn tại ${APP_NAME} đã được kích hoạt.`,
    `Email: ${to}`,
    `Mật khẩu: ${password}`,
    loginUrl ? `Đăng nhập: ${loginUrl}` : "",
    ``,
    `Vì lý do bảo mật, bạn nên đổi mật khẩu sau lần đăng nhập đầu tiên.`,
  ]
    .filter(Boolean)
    .join("\n");

  try {
    const { error } = await resend.emails.send({
      from: process.env.FROM_EMAIL!,
      to,
      subject: `Kích hoạt tài khoản ${APP_NAME}`,
      html,
      text,
    });
    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message ?? "Lỗi không xác định khi gửi email" };
  }
}
