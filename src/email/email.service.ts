import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';

export interface BookingConfirmationData {
  to: string;
  clientName: string;
  bookingRequestId: string;
}

export interface ConsultConfirmationData {
  to: string;
  clientName: string;
  consultDate: Date;
}

export interface BookingRejectedData {
  to: string;
  clientName: string;
}

export interface SessionReminderData {
  to: string;
  clientName: string;
  sessionDate: Date;
  artistName: string;
}

export interface GuestArtistBookingConfirmationData {
  to: string;
  artistName: string;
  startDate: Date;
  endDate: Date;
  numberOfTables: number;
  numberOfDays: number;
  totalPrice: number;
  discountPercent: number;
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly resend: Resend | null;
  private readonly from: string;
  private readonly studioName: string;
  private readonly studioAddress: string;
  private readonly studioPhone: string;
  private readonly studioWebsite: string;

  constructor(private readonly config: ConfigService) {
    const apiKey = config.get<string>('RESEND_API_KEY');

    if (apiKey && apiKey !== 're_placeholder') {
      this.resend = new Resend(apiKey);
    } else {
      this.resend = null;
      this.logger.warn('RESEND_API_KEY not configured — emails are disabled');
    }

    this.from = config.get<string>('EMAIL_FROM') ?? 'noreply@example.com';
    this.studioName = config.get<string>('STUDIO_NAME') ?? 'Tattoo Studio';
    this.studioAddress = config.get<string>('STUDIO_ADDRESS') ?? '';
    this.studioPhone = config.get<string>('STUDIO_PHONE') ?? '';
    this.studioWebsite = config.get<string>('STUDIO_WEBSITE') ?? '';
  }

  private footer(): string {
    const parts: string[] = [];
    if (this.studioAddress) parts.push(this.studioAddress);
    if (this.studioPhone) parts.push(this.studioPhone);
    if (this.studioWebsite)
      parts.push(
        `<a href="${this.studioWebsite}" style="color:#888;">${this.studioWebsite}</a>`,
      );

    return `
      <div style="margin-top:40px;padding-top:20px;border-top:1px solid #e5e5e5;font-size:12px;color:#888;line-height:1.6;">
        <strong>${this.studioName}</strong><br/>
        ${parts.join(' &bull; ')}
      </div>
    `;
  }

  private wrap(content: string): string {
    return `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1.0"/></head>
<body style="margin:0;padding:0;background:#f9f9f9;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9f9f9;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
          <tr>
            <td style="background:#111;padding:24px 32px;">
              <h1 style="margin:0;color:#fff;font-size:20px;letter-spacing:1px;">${this.studioName}</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:32px;">
              ${content}
              ${this.footer()}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
  }

  private async send(to: string, subject: string, html: string): Promise<void> {
    if (!this.resend) return;

    try {
      await this.resend.emails.send({ from: this.from, to, subject, html });
      this.logger.log(`Email sent: "${subject}" → ${to}`);
    } catch (err) {
      this.logger.error(`Failed to send email "${subject}" → ${to}`, err);
    }
  }

  async sendBookingConfirmation(data: BookingConfirmationData): Promise<void> {
    const { to, clientName, bookingRequestId } = data;
    const subject = `We received your booking request — ${this.studioName}`;

    const html = this.wrap(`
      <h2 style="margin:0 0 16px;color:#111;font-size:22px;">Thanks for reaching out, ${clientName}!</h2>
      <p style="color:#444;line-height:1.7;margin:0 0 16px;">
        We've received your tattoo booking request and our team will review it shortly.
        We'll be in touch with next steps as soon as possible.
      </p>
      <table cellpadding="0" cellspacing="0" style="background:#f5f5f5;border-radius:6px;padding:16px 20px;margin:24px 0;">
        <tr>
          <td style="font-size:13px;color:#666;">Reference ID</td>
        </tr>
        <tr>
          <td style="font-family:monospace;font-size:14px;color:#111;padding-top:4px;">${bookingRequestId}</td>
        </tr>
      </table>
      <p style="color:#444;line-height:1.7;margin:0;">
        If you have any questions in the meantime, feel free to reach out to us directly.
      </p>
    `);

    await this.send(to, subject, html);
  }

  async sendConsultConfirmation(data: ConsultConfirmationData): Promise<void> {
    const { to, clientName, consultDate } = data;
    const subject = `Your consultation is confirmed — ${this.studioName}`;

    const formattedDate = consultDate.toLocaleDateString('en-GB', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    const html = this.wrap(`
      <h2 style="margin:0 0 16px;color:#111;font-size:22px;">Consultation Confirmed, ${clientName}!</h2>
      <p style="color:#444;line-height:1.7;margin:0 0 16px;">
        Great news — your consultation has been scheduled. We look forward to meeting you and
        discussing your tattoo ideas in detail.
      </p>
      <table cellpadding="0" cellspacing="0" style="background:#f5f5f5;border-radius:6px;padding:16px 20px;margin:24px 0;width:100%;">
        <tr>
          <td style="font-size:13px;color:#666;padding-bottom:4px;">Consultation Date</td>
        </tr>
        <tr>
          <td style="font-size:17px;font-weight:bold;color:#111;">${formattedDate}</td>
        </tr>
      </table>
      <p style="color:#444;line-height:1.7;margin:0 0 16px;">
        Please arrive a few minutes early. If you need to reschedule, contact us as soon as possible.
      </p>
      <p style="color:#444;line-height:1.7;margin:0;">
        We can't wait to bring your vision to life!
      </p>
    `);

    await this.send(to, subject, html);
  }

  async sendBookingRejected(data: BookingRejectedData): Promise<void> {
    const { to, clientName } = data;
    const subject = `Regarding your booking request — ${this.studioName}`;

    const html = this.wrap(`
      <h2 style="margin:0 0 16px;color:#111;font-size:22px;">An update on your request, ${clientName}</h2>
      <p style="color:#444;line-height:1.7;margin:0 0 16px;">
        Thank you for your interest in getting a tattoo with us. After carefully reviewing your
        request, we're unfortunately unable to proceed with it at this time.
      </p>
      <p style="color:#444;line-height:1.7;margin:0 0 16px;">
        This may be due to scheduling constraints, style fit, or other factors. We encourage you
        to reach out to us directly if you'd like to discuss your options or submit a new request.
      </p>
      <p style="color:#444;line-height:1.7;margin:0;">
        We appreciate your understanding and hope to work with you in the future.
      </p>
    `);

    await this.send(to, subject, html);
  }

  async sendGuestArtistBookingConfirmation(
    data: GuestArtistBookingConfirmationData,
  ): Promise<void> {
    const {
      to,
      artistName,
      startDate,
      endDate,
      numberOfTables,
      numberOfDays,
      totalPrice,
      discountPercent,
    } = data;

    const subject = `Your guest artist booking is confirmed — ${this.studioName}`;

    const fmt = (d: Date) =>
      d.toLocaleDateString('en-GB', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });

    const discountRow =
      discountPercent > 0
        ? `<tr>
            <td style="font-size:13px;color:#666;padding-top:12px;padding-bottom:4px;">Discount Applied</td>
          </tr>
          <tr>
            <td style="font-size:15px;color:#111;">${discountPercent}% monthly discount</td>
          </tr>`
        : '';

    const html = this.wrap(`
      <h2 style="margin:0 0 16px;color:#111;font-size:22px;">Booking Confirmed, ${artistName}!</h2>
      <p style="color:#444;line-height:1.7;margin:0 0 16px;">
        We're excited to have you at ${this.studioName}. Here's a summary of your guest artist booking:
      </p>

      <table cellpadding="0" cellspacing="0" style="background:#f5f5f5;border-radius:6px;padding:16px 20px;margin:24px 0;width:100%;">
        <tr>
          <td style="font-size:13px;color:#666;padding-bottom:4px;">Guest Artist</td>
        </tr>
        <tr>
          <td style="font-size:16px;font-weight:bold;color:#111;padding-bottom:12px;">${artistName}</td>
        </tr>
        <tr>
          <td style="font-size:13px;color:#666;padding-bottom:4px;">Start Date</td>
        </tr>
        <tr>
          <td style="font-size:15px;color:#111;padding-bottom:12px;">${fmt(startDate)}</td>
        </tr>
        <tr>
          <td style="font-size:13px;color:#666;padding-bottom:4px;">End Date</td>
        </tr>
        <tr>
          <td style="font-size:15px;color:#111;padding-bottom:12px;">${fmt(endDate)}</td>
        </tr>
        <tr>
          <td style="font-size:13px;color:#666;padding-bottom:4px;">Duration</td>
        </tr>
        <tr>
          <td style="font-size:15px;color:#111;padding-bottom:12px;">${numberOfDays} day${numberOfDays !== 1 ? 's' : ''}</td>
        </tr>
        <tr>
          <td style="font-size:13px;color:#666;padding-bottom:4px;">Tables Reserved</td>
        </tr>
        <tr>
          <td style="font-size:15px;color:#111;padding-bottom:12px;">${numberOfTables} table${numberOfTables !== 1 ? 's' : ''} per day</td>
        </tr>
        ${discountRow}
        <tr>
          <td style="font-size:13px;color:#666;padding-top:12px;padding-bottom:4px;">Total Price</td>
        </tr>
        <tr>
          <td style="font-size:20px;font-weight:bold;color:#111;">€${totalPrice.toFixed(2)}</td>
        </tr>
      </table>

      <p style="color:#444;line-height:1.7;margin:0 0 12px;">
        <strong>Important — please read before arrival:</strong>
      </p>
      <ul style="color:#444;line-height:1.9;margin:0 0 16px;padding-left:20px;">
        <li>You must bring a valid <strong>health certificate</strong> and <strong>work permit</strong> on your first day.</li>
        <li>If your documents are found to be invalid upon arrival, your booking cannot proceed and <strong>payment is non-refundable</strong>.</li>
        <li>Please arrive on time and respect the studio's rules and shared spaces.</li>
      </ul>

      <p style="color:#444;line-height:1.7;margin:0;">
        If you have any questions, feel free to contact us directly. We look forward to working with you!
      </p>
    `);

    await this.send(to, subject, html);
  }

  async sendSessionReminder(data: SessionReminderData): Promise<void> {
    const { to, clientName, sessionDate, artistName } = data;
    const subject = `Reminder: Your tattoo session is tomorrow — ${this.studioName}`;

    const formattedDate = sessionDate.toLocaleDateString('en-GB', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    const formattedTime = sessionDate.toLocaleTimeString('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
    });

    const html = this.wrap(`
      <h2 style="margin:0 0 16px;color:#111;font-size:22px;">See you soon, ${clientName}!</h2>
      <p style="color:#444;line-height:1.7;margin:0 0 16px;">
        This is a friendly reminder that your tattoo session is coming up. Here are your details:
      </p>
      <table cellpadding="0" cellspacing="0" style="background:#f5f5f5;border-radius:6px;padding:16px 20px;margin:24px 0;width:100%;">
        <tr>
          <td style="font-size:13px;color:#666;padding-bottom:4px;">Date &amp; Time</td>
        </tr>
        <tr>
          <td style="font-size:17px;font-weight:bold;color:#111;padding-bottom:16px;">${formattedDate} at ${formattedTime}</td>
        </tr>
        <tr>
          <td style="font-size:13px;color:#666;padding-bottom:4px;">Artist</td>
        </tr>
        <tr>
          <td style="font-size:17px;font-weight:bold;color:#111;">${artistName}</td>
        </tr>
      </table>
      <p style="color:#444;line-height:1.7;margin:0 0 16px;">
        <strong>A few things to keep in mind:</strong>
      </p>
      <ul style="color:#444;line-height:1.9;margin:0 0 16px;padding-left:20px;">
        <li>Get a good night's sleep and eat a proper meal before your session</li>
        <li>Stay hydrated and avoid alcohol 24 hours before</li>
        <li>Wear comfortable clothing that provides easy access to the tattoo area</li>
        <li>Bring a valid photo ID</li>
      </ul>
      <p style="color:#444;line-height:1.7;margin:0;">
        If you need to reschedule, please contact us as soon as possible. We look forward to seeing you!
      </p>
    `);

    await this.send(to, subject, html);
  }
}
