import { sendMail } from "./nodemailer";
import config from "../app/config/index";

export const sendVerificationEmail = (email: string, name: string, verificationUrl: string, otp?: string) => {
    const html = `
        <div style="font-family: Arial, sans-serif; width: 100%; max-width: 500px; margin: 0 auto; padding: 24px; background: white; border: 1px solid #f0f0f0; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.05); box-sizing: border-box;">
            <h2 style="color: #1a1a1a; margin-top: 0; font-size: 20px;">Hej ${name},</h2>
            <p style="color: #4a4a4a; line-height: 1.6; font-size: 14px;">Vänligen verifiera din e-postadress genom att klicka på knappen nedan:</p>
            <div style="text-align: center; margin: 32px 0;">
                <a href="${verificationUrl}" target="_blank" style="background-color: #7C5800; background-image: linear-gradient(to right, #7C5800, #FFB800); color: #ffffff !important; padding: 12px 30px; text-decoration: none !important; border-radius: 24px; display: inline-block; font-weight: 500; font-size: 14px; text-align: center; border: none;">Verifiera e-post</a>
            </div>
            <p style="color: #8a8a8a; font-size: 12px; line-height: 1.6; word-break: break-all;">Eller kopiera denna länk: <span style="word-break: break-all;">${verificationUrl}</span></p>
            ${
                "" /*
                otp
                    ? `<div style="margin-top: 24px; padding: 16px; background: #fffaf0; border-radius: 8px; border: 1px solid #ffe8b8;">
                        <p style="color: #7C5800; font-size: 14px; text-align: center; margin: 0 0 8px 0;">Eller ange denna 6-siffriga kod i appen:</p>
                        <p style="color: #1a1a1a; font-size: 28px; text-align: center; margin: 0; font-weight: bold; letter-spacing: 6px;">${otp}</p>
                        <p style="color: #8a8a8a; font-size: 12px; text-align: center; margin: 8px 0 0 0;">OTP-koden går ut om 10 minuter.</p>
                       </div>`
                    : ""
            */
            }
            <p style="color: #8a8a8a; font-size: 12px; margin-top: 24px;">Denna länk går ut om 24 timmar.</p>
        </div>
    `;
    sendMail(email, "Verifiera din e-postadress", html);
};

export const sendOtpEmail = (email: string, otp: string, name?: string) => {
    const html = `
        <div style="font-family: Arial, sans-serif; width: 100%; max-width: 420px; margin: 0 auto; padding: 24px; background: white; border: 1px solid #f0f0f0; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.05); box-sizing: border-box;">
            <h2 style="color: #1a1a1a; margin-top: 0; font-size: 20px;">${name ? `Hej ${name},` : "Hej,"}</h2>
            <p style="color: #4a4a4a; line-height: 1.6; font-size: 14px;">Din engångskod (OTP) är:</p>
            <div style="background: #fffaf0; border: 1px solid #ffe8b8; padding: 20px; text-align: center; margin: 24px 0; border-radius: 12px;">
                <div style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #1a1a1a;">
                    ${otp}
                </div>
            </div>
            <p style="color: #8a8a8a; font-size: 12px;">Denna kod går ut om 10 minuter.</p>
        </div>
    `;
    sendMail(email, "Din engångskod (OTP)", html);
};

export const sendWelcomeEmail = (email: string, name: string) => {
    const html = `
        <div style="font-family: Arial, sans-serif; width: 100%; max-width: 520px; margin: 0 auto; padding: 0; background: white; border: 1px solid #f0f0f0; border-radius: 16px; box-shadow: 0 4px 20px rgba(0,0,0,0.08); overflow: hidden; box-sizing: border-box;">
            <div style="background-color: #7C5800; background-image: linear-gradient(135deg, #7C5800 0%, #FFB800 100%); padding: 32px 24px; text-align: center;">
                <h1 style="color: white; margin: 0; font-size: 26px; font-weight: bold;">Välkommen till Kungsbjörnen!</h1>
                <p style="color: rgba(255,255,255,0.9); margin: 12px 0 0 0; font-size: 15px;">Vi är glada att ha dig med oss</p>
            </div>
            <div style="padding: 32px 28px;">
                <h2 style="color: #1a1a1a; margin: 0 0 16px 0; font-size: 20px;">Hej ${name},</h2>
                <p style="color: #4a4a4a; line-height: 1.8; margin: 0 0 24px 0; font-size: 15px;">Tack för att du valt oss! Vi är glada att du blivit en del av vår gemenskap och ser fram emot att du kommer igång.</p>
                
                <p style="color: #8a8a8a; font-size: 13px; line-height: 1.7; margin: 24px 0 0 0;">Om du har några frågor är du varmt välkommen att kontakta vår kundtjänst. Vi finns här för att hjälpa dig!</p>
            </div>
            <div style="background: #fafafa; padding: 20px 28px; text-align: center; border-top: 1px solid #f0f0f0;">
                <p style="color: #8a8a8a; margin: 0; font-size: 12px;">© 2026 Kungsbjörnen. Alla rättigheter förbehållna.</p>
            </div>
        </div>
    `;
    sendMail(email, "Välkommen till Kungsbjörnen!", html);
};

export const sendAdminCreatedEmail = (email: string, name: string, password: string) => {
    const loginUrl = `${config.client_url}/auth/login`;
    const html = `
        <div style="font-family: Arial, sans-serif; width: 100%; max-width: 500px; margin: 0 auto; padding: 24px; background: white; border: 1px solid #f0f0f0; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.05); box-sizing: border-box;">
            <h2 style="color: #1a1a1a; margin-top: 0; font-size: 20px;">Hej ${name},</h2>
            <p style="color: #4a4a4a; line-height: 1.6; font-size: 14px;">Du har lagts till som administratör för Kungsbjörnen.</p>
            <p style="color: #4a4a4a; line-height: 1.6; font-size: 14px;">Här är dina tillfälliga inloggningsuppgifter:</p>
            <div style="background: #fffaf0; border: 1px solid #ffe8b8; padding: 16px; margin: 20px 0; border-radius: 8px;">
                <p style="margin: 0 0 8px 0; color: #4a4a4a; word-break: break-all;"><strong>E-post:</strong> ${email}</p>
                <p style="margin: 0; color: #4a4a4a; word-break: break-all;"><strong>Lösenord:</strong> ${password}</p>
            </div>
            <p style="color: #4a4a4a; line-height: 1.6; font-size: 14px;">Vänligen logga in med knappen nedan och ändra ditt lösenord omedelbart.</p>
            <div style="text-align: center; margin: 32px 0;">
                <a href="${loginUrl}" target="_blank" style="background-color: #7C5800; background-image: linear-gradient(to right, #7C5800, #FFB800); color: #ffffff !important; padding: 12px 30px; text-decoration: none !important; border-radius: 24px; display: inline-block; font-weight: 500; font-size: 14px; text-align: center; border: none;">Logga in på kontrollpanelen</a>
            </div>
        </div>
    `;
    sendMail(email, "Ditt administratörskonto har skapats", html);
};

export const sendEmailUpdateVerification = (email: string, name: string, verificationUrl: string) => {
    const html = `
        <div style="font-family: Arial, sans-serif; width: 100%; max-width: 500px; margin: 0 auto; padding: 24px; background: white; border: 1px solid #f0f0f0; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.05); box-sizing: border-box;">
            <h2 style="color: #1a1a1a; margin-top: 0; font-size: 20px;">Hej ${name},</h2>
            <p style="color: #4a4a4a; line-height: 1.6; font-size: 14px;">Vänligen verifiera din nya e-postadress genom att klicka på knappen nedan:</p>
            <div style="text-align: center; margin: 32px 0;">
                <a href="${verificationUrl}" target="_blank" style="background-color: #7C5800; background-image: linear-gradient(to right, #7C5800, #FFB800); color: #ffffff !important; padding: 12px 30px; text-decoration: none !important; border-radius: 24px; display: inline-block; font-weight: 500; font-size: 14px; text-align: center; border: none;">Verifiera ny e-post</a>
            </div>
            <p style="color: #8a8a8a; font-size: 12px;">Denna länk går ut om 24 timmar.</p>
        </div>
    `;
    sendMail(email, "Verifiera din nya e-postadress", html);
};

export const sendGroupInvitationEmail = (email: string, groupName: string, code: string) => {
    const registerUrl = `${config.client_url}/auth/member/register?code=${encodeURIComponent(code)}&email=${encodeURIComponent(email)}`;
    const loginUrl = `${config.client_url}/auth/member/login?code=${encodeURIComponent(code)}&email=${encodeURIComponent(email)}`;
    const html = `
        <div style="font-family: Arial, sans-serif; width: 100%; max-width: 500px; margin: 0 auto; padding: 24px; background: white; border: 1px solid #f0f0f0; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.05); box-sizing: border-box;">
            <h2 style="color: #1a1a1a; margin-top: 0; font-size: 20px;">Hej,</h2>
            <p style="color: #4a4a4a; line-height: 1.6; font-size: 14px;">Du har blivit inbjuden att gå med i gruppen: <strong style="color: #7C5800;">${groupName}</strong>.</p>
            
            <p style="color: #4a4a4a; line-height: 1.6; font-size: 14px;">Om du inte har ett konto, klicka nedan för att registrera dig och gå med:</p>
            <div style="text-align: center; margin: 24px 0;">
                <a href="${registerUrl}" target="_blank" style="background-color: #7C5800; background-image: linear-gradient(to right, #7C5800, #FFB800); color: #ffffff !important; padding: 12px 30px; text-decoration: none !important; border-radius: 24px; display: inline-block; font-weight: 500; font-size: 14px; text-align: center; border: none;">Gå med i gruppen &amp; registrera</a>
            </div>
            
            <p style="color: #4a4a4a; line-height: 1.6; font-size: 14px;">Om du redan har ett konto, logga in för att gå med:</p>
            <div style="text-align: center; margin: 24px 0;">
                <a href="${loginUrl}" target="_blank" style="background-color: #1a1a1a; color: #ffffff !important; padding: 12px 30px; text-decoration: none !important; border-radius: 24px; display: inline-block; font-weight: 500; font-size: 14px; text-align: center; border: none;">Logga in &amp; gå med</a>
            </div>

            <p style="color: #8a8a8a; font-size: 12px; line-height: 1.6; word-break: break-all;">Registreringslänk: <span style="word-break: break-all;">${registerUrl}</span></p>
        </div>
    `;
    sendMail(email, `Du har blivit inbjuden att gå med i ${groupName}`, html);
};

export const sendOrderConfirmationEmail = (email: string, customerName: string, orderDetails: any) => {
    const { items, totalPrice, address, status, _id, orderId } = orderDetails;
    const orderIdDisplay = _id || orderId;

    const itemsHtml = items
        .map(
            (item: any) => `
        <tr style="border-bottom: 1px solid #f0f0f0;">
            <td style="padding: 12px 8px; color: #1a1a1a; vertical-align: top;">
                <div style="font-weight: 500; font-size: 14px; color: #1a1a1a;">${item.productName}</div>
                <div style="font-size: 12px; color: #8a8a8a; margin-top: 4px;">${item.quantity} × ${item.singlePrice.toFixed(2)} SEK</div>
            </td>
            <td style="padding: 12px 8px; text-align: right; color: #1a1a1a; font-weight: 600; font-size: 14px; vertical-align: top; white-space: nowrap;">
                ${item.lineTotal.toFixed(2)} SEK
            </td>
        </tr>
    `,
        )
        .join("");

    const html = `
        <div style="font-family: Arial, sans-serif; width: 100%; max-width: 580px; margin: 0 auto; padding: 0; background: white; border: 1px solid #f0f0f0; border-radius: 16px; box-shadow: 0 4px 20px rgba(0,0,0,0.08); overflow: hidden; box-sizing: border-box;">
            <div style="background-color: #7C5800; background-image: linear-gradient(135deg, #7C5800 0%, #FFB800 100%); padding: 28px 20px; text-align: center;">
                <h1 style="color: white; margin: 0; font-size: 24px; font-weight: bold;">Order bekräftad!</h1>
                <p style="color: rgba(255,255,255,0.9); margin: 8px 0 0 0; font-size: 14px;">Tack för din order</p>
                ${orderIdDisplay ? `<p style="color: rgba(255,255,255,0.85); margin: 6px 0 0 0; font-size: 13px; font-family: monospace;">Order-ID: ${orderIdDisplay}</p>` : ""}
            </div>
            
            <div style="padding: 24px 20px;">
                <h2 style="color: #1a1a1a; margin: 0 0 16px 0; font-size: 18px;">Hej ${customerName},</h2>
                
                <p style="color: #4a4a4a; line-height: 1.6; margin: 0 0 24px 0; font-size: 14px;">
                    Vi har tagit emot din order! Din orderstatus är: <strong style="color: #7C5800;">${status}</strong>.
                </p>
                
                <div style="background: #fffaf0; border: 1px solid #ffe8b8; border-radius: 10px; padding: 16px; margin-bottom: 24px;">
                    <h3 style="color: #1a1a1a; margin: 0 0 12px 0; font-size: 16px;">Ordersammanfattning</h3>
                    <table style="width: 100%; border-collapse: collapse;">
                        <thead>
                            <tr style="border-bottom: 2px solid #ffe8b8;">
                                <th style="padding: 8px; text-align: left; font-size: 12px; color: #7C5800; text-transform: uppercase;">Artikel &amp; Antal</th>
                                <th style="padding: 8px; text-align: right; font-size: 12px; color: #7C5800; text-transform: uppercase;">Totalt</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${itemsHtml}
                        </tbody>
                        <tfoot>
                            <tr>
                                <td style="padding: 12px 8px 4px 8px; text-align: right; font-weight: bold; color: #1a1a1a; font-size: 14px;">Ordersumma:</td>
                                <td style="padding: 12px 8px 4px 8px; text-align: right; font-weight: bold; color: #7C5800; font-size: 16px; white-space: nowrap;">${totalPrice.toFixed(2)} SEK</td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
                
                <div style="background: #f9f9f9; border-radius: 10px; padding: 16px; margin-bottom: 24px;">
                    <h3 style="color: #1a1a1a; margin: 0 0 8px 0; font-size: 15px;">Leveransadress</h3>
                    <p style="color: #4a4a4a; margin: 0; line-height: 1.6; font-size: 14px;">
                        ${address.street}<br>
                        ${address.city}, ${address.postalCode}<br>
                        ${address.locality}
                    </p>
                </div>
                
                <p style="color: #8a8a8a; font-size: 12px; line-height: 1.6; margin: 0;">
                    Om du har några frågor om din order är du varmt välkommen att kontakta vår kundtjänst.
                </p>
            </div>
            
            <div style="background: #fafafa; padding: 16px 20px; text-align: center; border-top: 1px solid #f0f0f0;">
                ${orderIdDisplay ? `<p style="color: #8a8a8a; margin: 0 0 6px 0; font-size: 12px;">Order-ID: <strong style="color: #4a4a4a;">${orderIdDisplay}</strong></p>` : ""}
                <p style="color: #8a8a8a; margin: 0; font-size: 12px;">© 2026 Kungsbjörnen. Alla rättigheter förbehållna.</p>
            </div>
        </div>
    `;

    sendMail(email, "Din orderbekräftelse - Kungsbjörnen", html);
};

export const sendPasswordChangedEmail = (email: string, name?: string, newPassword?: string) => {
    const loginUrl = `${config.client_url}/auth/login`;
    const html = `
        <div style="font-family: Arial, sans-serif; width: 100%; max-width: 500px; margin: 0 auto; padding: 24px; background: white; border: 1px solid #f0f0f0; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.05); box-sizing: border-box;">
            <h2 style="color: #1a1a1a; margin-top: 0; font-size: 20px;">${name ? `Hej ${name},` : "Hej,"}</h2>
            <p style="color: #4a4a4a; line-height: 1.6; font-size: 14px;">Ditt lösenord för Kungsbjörnen har uppdaterats av en administratör.</p>
            ${
                newPassword
                    ? `<div style="background: #fffaf0; border: 1px solid #ffe8b8; padding: 16px; margin: 20px 0; border-radius: 8px;">
                        <p style="margin: 0; color: #4a4a4a; word-break: break-all;"><strong>Nytt lösenord:</strong> ${newPassword}</p>
                       </div>`
                    : ""
            }
            <p style="color: #4a4a4a; line-height: 1.6; font-size: 14px;">Du kan nu logga in med ditt uppdaterade lösenord.</p>
            <div style="text-align: center; margin: 32px 0;">
                <a href="${loginUrl}" target="_blank" style="background-color: #7C5800; background-image: linear-gradient(to right, #7C5800, #FFB800); color: #ffffff !important; padding: 12px 30px; text-decoration: none !important; border-radius: 24px; display: inline-block; font-weight: 500; font-size: 14px; text-align: center; border: none;">Logga in på kontrollpanelen</a>
            </div>
            <p style="color: #8a8a8a; font-size: 12px; margin-top: 24px;">Om du inte har begärt eller förväntade dig denna ändring, vänligen kontakta kundtjänst omedelbart.</p>
        </div>
    `;
    sendMail(email, "Ditt lösenord har uppdaterats - Kungsbjörnen", html);
};

export const sendCustomerServiceConfirmationEmail = (
    email: string,
    name: string,
    requestDetails: {
        _id?: string;
        issueType: string;
        orderId?: string;
        description: string;
    },
) => {
    const { _id, issueType, orderId, description } = requestDetails;
    const issueTypeName = issueType === "reklamation" ? "Reklamation" : "Byte";

    const html = `
        <div style="font-family: Arial, sans-serif; width: 100%; max-width: 580px; margin: 0 auto; padding: 0; background: white; border: 1px solid #f0f0f0; border-radius: 16px; box-shadow: 0 4px 20px rgba(0,0,0,0.08); overflow: hidden; box-sizing: border-box; word-break: break-word; overflow-wrap: break-word;">
            <div style="background-color: #7C5800; background-image: linear-gradient(135deg, #7C5800 0%, #FFB800 100%); padding: 24px 16px; text-align: center;">
                <h1 style="color: white; margin: 0; font-size: 22px; font-weight: bold;">Kundtjänstärende mottaget</h1>
                <p style="color: rgba(255,255,255,0.9); margin: 6px 0 0 0; font-size: 13px;">Vi har tagit emot ditt ärende</p>
                ${_id ? `<p style="color: rgba(255,255,255,0.85); margin: 6px 0 0 0; font-size: 12px; font-family: monospace; word-break: break-all;">Ärende-ID: ${_id}</p>` : ""}
            </div>
            
            <div style="padding: 20px 16px;">
                <h2 style="color: #1a1a1a; margin: 0 0 14px 0; font-size: 17px;">Hej ${name},</h2>
                
                <p style="color: #4a4a4a; line-height: 1.6; margin: 0 0 20px 0; font-size: 14px;">
                    Tack för att du kontaktar Kungsbjörnen Kundtjänst. Vi har tagit emot ditt ärende och vårt team kommer att hantera det inom kort.
                </p>
                
                <div style="background: #fffaf0; border: 1px solid #ffe8b8; border-radius: 10px; padding: 14px 16px; margin-bottom: 20px;">
                    <h3 style="color: #1a1a1a; margin: 0 0 12px 0; font-size: 15px;">Ärendedetaljer</h3>
                    <div style="font-size: 14px; color: #4a4a4a; line-height: 1.6;">
                        <div style="margin-bottom: 8px;">
                            <strong style="color: #1a1a1a;">Ärendetyp:</strong>
                            <span style="color: #7C5800; font-weight: 600; margin-left: 4px;">${issueTypeName}</span>
                        </div>
                        ${
                            orderId
                                ? `<div style="margin-bottom: 8px; word-break: break-all;">
                            <strong style="color: #1a1a1a;">Order-ID:</strong>
                            <span style="color: #4a4a4a; margin-left: 4px;">${orderId}</span>
                        </div>`
                                : ""
                        }
                        <div>
                            <strong style="color: #1a1a1a; display: block; margin-bottom: 4px;">Beskrivning:</strong>
                            <div style="color: #4a4a4a; white-space: pre-wrap; word-break: break-word; background: #ffffff; padding: 10px; border-radius: 6px; border: 1px solid #f0e0c0;">${description}</div>
                        </div>
                    </div>
                </div>
                
                <p style="color: #8a8a8a; font-size: 12px; line-height: 1.6; margin: 0;">
                    Vår kundtjänst återkommer till dig så snart som möjligt. Om du vill komplettera ditt ärende kan du svara direkt på detta e-postmeddelande.
                </p>
            </div>
            
            <div style="background: #fafafa; padding: 14px 16px; text-align: center; border-top: 1px solid #f0f0f0;">
                <p style="color: #8a8a8a; margin: 0; font-size: 12px;">© 2026 Kungsbjörnen. Alla rättigheter förbehållna.</p>
            </div>
        </div>
    `;

    sendMail(email, "Kundtjänstärende mottaget - Kungsbjörnen", html);
};

export const sendCustomerServiceReplyEmail = (
    email: string,
    name: string,
    details: {
        _id: string;
        issueType: string;
        orderId?: string;
        status: string;
        adminNotes: string;
    },
) => {
    const { _id, issueType, orderId, status, adminNotes } = details;
    const issueTypeName = issueType === "reklamation" ? "Reklamation" : "Byte";
    const statusFormatted = status.replace("_", " ").toUpperCase();

    const html = `
        <div style="font-family: Arial, sans-serif; width: 100%; max-width: 580px; margin: 0 auto; padding: 0; background: white; border: 1px solid #f0f0f0; border-radius: 16px; box-shadow: 0 4px 20px rgba(0,0,0,0.08); overflow: hidden; box-sizing: border-box; word-break: break-word; overflow-wrap: break-word;">
            <div style="background-color: #7C5800; background-image: linear-gradient(135deg, #7C5800 0%, #FFB800 100%); padding: 24px 16px; text-align: center;">
                <h1 style="color: white; margin: 0; font-size: 22px; font-weight: bold;">Uppdatering i ditt kundtjänstärende</h1>
                <p style="color: rgba(255,255,255,0.9); margin: 6px 0 0 0; font-size: 13px;">Svar från Kungsbjörnen Kundtjänst</p>
                <p style="color: rgba(255,255,255,0.85); margin: 6px 0 0 0; font-size: 12px; font-family: monospace; word-break: break-all;">Ärende-ID: ${_id}</p>
            </div>
            
            <div style="padding: 20px 16px;">
                <h2 style="color: #1a1a1a; margin: 0 0 14px 0; font-size: 17px;">Hej ${name},</h2>
                
                <p style="color: #4a4a4a; line-height: 1.6; margin: 0 0 18px 0; font-size: 14px;">
                    Vår kundtjänst har uppdaterat ditt ärende. Nuvarande status för ditt ärende är: <strong style="color: #7C5800;">${statusFormatted}</strong>.
                </p>
                
                <div style="background: #fffaf0; border: 1px solid #ffe8b8; border-radius: 10px; padding: 14px 16px; margin-bottom: 20px;">
                    <h3 style="color: #1a1a1a; margin: 0 0 8px 0; font-size: 15px;">Svar från kundtjänst / Meddelande:</h3>
                    <p style="color: #1a1a1a; margin: 0; line-height: 1.6; font-size: 14px; white-space: pre-wrap; word-break: break-word;">${adminNotes}</p>
                </div>
                
                <div style="background: #f9f9f9; border-radius: 10px; padding: 12px 14px; margin-bottom: 20px; font-size: 13px; color: #666; word-break: break-all;">
                    <p style="margin: 0 0 4px 0;"><strong>Ärendetyp:</strong> ${issueTypeName}</p>
                    ${orderId ? `<p style="margin: 0;"><strong>Order-ID:</strong> ${orderId}</p>` : ""}
                </div>

                <p style="color: #8a8a8a; font-size: 12px; line-height: 1.6; margin: 0;">
                    Om du har ytterligare frågor eller behöver mer hjälp kan du svara direkt på detta e-postmeddelande.
                </p>
            </div>
            
            <div style="background: #fafafa; padding: 14px 16px; text-align: center; border-top: 1px solid #f0f0f0;">
                <p style="color: #8a8a8a; margin: 0; font-size: 12px;">© 2026 Kungsbjörnen. Alla rättigheter förbehållna.</p>
            </div>
        </div>
    `;

    sendMail(email, `Uppdatering i kundtjänstärende #${_id} - Kungsbjörnen`, html);
};
