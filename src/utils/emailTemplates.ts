import { sendMail } from "./nodemailer";
import config from "../app/config/index";

const buttonStyle = "background: linear-gradient(to right, #7C5800, #FFB800); color: white; padding: 12px 30px; text-decoration: none; border-radius: 24px; display: inline-block; font-weight: 500; font-size: 14px;";
const containerStyle = "font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 24px; background: white; border: 1px solid #f0f0f0; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.05);";

export const sendVerificationEmail = (email: string, name: string, verificationUrl: string, otp?: string) => {
    const html = `
        <div style="${containerStyle}">
            <h2 style="color: #1a1a1a; margin-top: 0;">Hello ${name},</h2>
            <p style="color: #4a4a4a; line-height: 1.6;">Please verify your email address by clicking the button below:</p>
            <div style="text-align: center; margin: 32px 0;">
                <a href="${verificationUrl}" style="${buttonStyle}">Verify Email</a>
            </div>
            <p style="color: #8a8a8a; font-size: 12px; line-height: 1.6;">Or copy this link: <span style="word-break: break-all;">${verificationUrl}</span></p>
            ${
                otp
                    ? `<div style="margin-top: 24px; padding: 16px; background: #fffaf0; border-radius: 8px; border: 1px solid #ffe8b8;">
                        <p style="color: #7C5800; font-size: 14px; text-align: center; margin: 0 0 8px 0;">Or enter this 6-digit code in the app:</p>
                        <p style="color: #1a1a1a; font-size: 32px; text-align: center; margin: 0; font-weight: bold; letter-spacing: 8px;">${otp}</p>
                        <p style="color: #8a8a8a; font-size: 12px; text-align: center; margin: 8px 0 0 0;">OTP expires in 10 minutes.</p>
                       </div>`
                    : ""
            }
            <p style="color: #8a8a8a; font-size: 12px; margin-top: 24px;">This link expires in 24 hours.</p>
        </div>
    `;
    sendMail(email, "Verify Your Email", html);
};

export const sendOtpEmail = (email: string, otp: string, name?: string) => {
    const html = `
        <div style="${containerStyle} max-width: 420px;">
            <h2 style="color: #1a1a1a; margin-top: 0;">${name ? `Hello ${name},` : "Hello,"}</h2>
            <p style="color: #4a4a4a; line-height: 1.6;">Your OTP code is:</p>
            <div style="background: #fffaf0; border: 1px solid #ffe8b8; padding: 20px; text-align: center; margin: 24px 0; border-radius: 12px;">
                <div style="font-size: 36px; font-weight: bold; letter-spacing: 10px; color: #1a1a1a;">
                    ${otp}
                </div>
            </div>
            <p style="color: #8a8a8a; font-size: 12px;">This code expires in 10 minutes.</p>
        </div>
    `;
    sendMail(email, "Your OTP Code", html);
};

export const sendWelcomeEmail = (email: string, name: string) => {
    const html = `
        <div style="font-family: Arial, sans-serif; max-width: 520px; margin: 0 auto; padding: 0; background: white; border: 1px solid #f0f0f0; border-radius: 16px; box-shadow: 0 4px 20px rgba(0,0,0,0.08); overflow: hidden;">
            <div style="background: linear-gradient(135deg, #7C5800 0%, #FFB800 100%); padding: 32px 24px; text-align: center;">
                <h1 style="color: white; margin: 0; font-size: 28px; font-weight: bold;">Welcome to ProteinW!</h1>
                <p style="color: rgba(255,255,255,0.9); margin: 12px 0 0 0; font-size: 15px;">We're excited to have you on board</p>
            </div>
            <div style="padding: 32px 28px;">
                <h2 style="color: #1a1a1a; margin: 0 0 16px 0; font-size: 22px;">Hello ${name},</h2>
                <p style="color: #4a4a4a; line-height: 1.8; margin: 0 0 24px 0; font-size: 15px;">Thank you for joining us! We're thrilled to have you become a part of our community and can't wait for you to get started.</p>
                
                <p style="color: #8a8a8a; font-size: 13px; line-height: 1.7; margin: 24px 0 0 0;">If you have any questions, feel free to reach out to our support team. We're here to help!</p>
            </div>
            <div style="background: #fafafa; padding: 20px 28px; text-align: center; border-top: 1px solid #f0f0f0;">
                <p style="color: #8a8a8a; margin: 0; font-size: 12px;">© 2026 ProteinW. All rights reserved.</p>
            </div>
        </div>
    `;
    sendMail(email, "Welcome to ProteinW!", html);
};

export const sendEmailUpdateVerification = (email: string, name: string, verificationUrl: string) => {
    const html = `
        <div style="${containerStyle}">
            <h2 style="color: #1a1a1a; margin-top: 0;">Hello ${name},</h2>
            <p style="color: #4a4a4a; line-height: 1.6;">Please verify your new email address by clicking the button below:</p>
            <div style="text-align: center; margin: 32px 0;">
                <a href="${verificationUrl}" style="${buttonStyle}">Verify New Email</a>
            </div>
            <p style="color: #8a8a8a; font-size: 12px;">This link expires in 24 hours.</p>
        </div>
    `;
    sendMail(email, "Verify Your New Email", html);
};

export const sendGroupInvitationEmail = (email: string, groupName: string) => {
    const registerUrl = `${config.client_url}/auth/member?email=${encodeURIComponent(email)}`;
    const html = `
        <div style="${containerStyle}">
            <h2 style="color: #1a1a1a; margin-top: 0;">Hello,</h2>
            <p style="color: #4a4a4a; line-height: 1.6;">You have been invited to join the group: <strong style="color: #7C5800;">${groupName}</strong>.</p>
            <p style="color: #4a4a4a; line-height: 1.6;">Please register using the button below to accept the invitation:</p>
            <div style="text-align: center; margin: 32px 0;">
                <a href="${registerUrl}" style="${buttonStyle}">Join Group</a>
            </div>
            <p style="color: #8a8a8a; font-size: 12px; line-height: 1.6;">Or copy this link: <span style="word-break: break-all;">${registerUrl}</span></p>
        </div>
    `;
    sendMail(email, `You've Been Invited to Join ${groupName}`, html);
};

export const sendOrderConfirmationEmail = (email: string, customerName: string, orderDetails: any) => {
    const { items, totalPrice, address, status } = orderDetails;

    const itemsHtml = items
        .map(
            (item: any) => `
        <tr style="border-bottom: 1px solid #f0f0f0;">
            <td style="padding: 12px 8px; color: #4a4a4a;">${item.productName}</td>
            <td style="padding: 12px 8px; text-align: center; color: #4a4a4a;">${item.quantity}x</td>
            <td style="padding: 12px 8px; text-align: right; color: #4a4a4a;">${item.singlePrice.toFixed(2)} SEK</td>
            <td style="padding: 12px 8px; text-align: right; color: #4a4a4a; font-weight: 500;">${item.lineTotal.toFixed(2)} SEK</td>
        </tr>
    `,
        )
        .join("");

    const html = `
        <div style="font-family: Arial, sans-serif; max-width: 580px; margin: 0 auto; padding: 0; background: white; border: 1px solid #f0f0f0; border-radius: 16px; box-shadow: 0 4px 20px rgba(0,0,0,0.08); overflow: hidden;">
            <div style="background: linear-gradient(135deg, #7C5800 0%, #FFB800 100%); padding: 32px 24px; text-align: center;">
                <h1 style="color: white; margin: 0; font-size: 28px; font-weight: bold;">Order Confirmed!</h1>
                <p style="color: rgba(255,255,255,0.9); margin: 12px 0 0 0; font-size: 15px;">Thank you for your order</p>
            </div>
            
            <div style="padding: 32px 28px;">
                <h2 style="color: #1a1a1a; margin: 0 0 20px 0; font-size: 20px;">Hello ${customerName},</h2>
                
                <p style="color: #4a4a4a; line-height: 1.8; margin: 0 0 28px 0; font-size: 15px;">
                    We've received your order! Your order status is: <strong style="color: #7C5800;">${status}</strong>.
                </p>
                
                <div style="background: #fffaf0; border: 1px solid #ffe8b8; border-radius: 10px; padding: 20px; margin-bottom: 28px;">
                    <h3 style="color: #1a1a1a; margin: 0 0 16px 0; font-size: 18px;">Order Summary</h3>
                    <table style="width: 100%; border-collapse: collapse;">
                        <thead>
                            <tr style="background: #f9f9f9;">
                                <th style="padding: 12px 8px; text-align: left; font-size: 13px; color: #7C5800;">Item</th>
                                <th style="padding: 12px 8px; text-align: center; font-size: 13px; color: #7C5800;">Qty</th>
                                <th style="padding: 12px 8px; text-align: right; font-size: 13px; color: #7C5800;">Price</th>
                                <th style="padding: 12px 8px; text-align: right; font-size: 13px; color: #7C5800;">Total</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${itemsHtml}
                        </tbody>
                        <tfoot>
                            <tr style="background: #f9f9f9;">
                                <td colspan="3" style="padding: 12px 8px; text-align: right; font-weight: bold; color: #1a1a1a; font-size: 16px;">Order Total:</td>
                                <td style="padding: 12px 8px; text-align: right; font-weight: bold; color: #7C5800; font-size: 18px;">${totalPrice.toFixed(2)} SEK</td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
                
                <div style="background: #f9f9f9; border-radius: 10px; padding: 20px; margin-bottom: 28px;">
                    <h3 style="color: #1a1a1a; margin: 0 0 12px 0; font-size: 16px;">Shipping Address</h3>
                    <p style="color: #4a4a4a; margin: 0; line-height: 1.7; font-size: 14px;">
                        ${address.street}<br>
                        ${address.city}, ${address.postalCode}<br>
                        ${address.country}
                    </p>
                </div>
                
                <p style="color: #8a8a8a; font-size: 13px; line-height: 1.7; margin: 0;">
                    If you have any questions about your order, feel free to reach out to our support team.
                </p>
            </div>
            
            <div style="background: #fafafa; padding: 20px 28px; text-align: center; border-top: 1px solid #f0f0f0;">
                <p style="color: #8a8a8a; margin: 0; font-size: 12px;">© 2026 ProteinW. All rights reserved.</p>
            </div>
        </div>
    `;

    sendMail(email, "Your Order Confirmation - ProteinW", html);
};
