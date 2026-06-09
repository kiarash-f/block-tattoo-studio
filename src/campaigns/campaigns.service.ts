import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';
import { PrismaService } from '../prisma/prisma.service';
import { SendCampaignDto } from './dto/send-campaign.dto';

const BATCH_SIZE = 100; // Resend batch limit

export interface CampaignResult {
  queued: number;
  skipped: number; // clients with no email address
  batches: number;
  errors: string[];
}

@Injectable()
export class CampaignsService {
  private readonly logger = new Logger(CampaignsService.name);
  private readonly resend: Resend | null;
  private readonly from: string;
  private readonly studioName: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {
    const apiKey = config.get<string>('RESEND_API_KEY');
    this.resend =
      apiKey && apiKey !== 're_placeholder' ? new Resend(apiKey) : null;
    this.from = config.get<string>('EMAIL_FROM') ?? 'noreply@example.com';
    this.studioName = config.get<string>('STUDIO_NAME') ?? 'Tattoo Studio';
  }

  async sendCampaign(dto: SendCampaignDto): Promise<CampaignResult> {
    const { subject, body, audience = 'all' } = dto;

    const emails = await this.resolveAudience(audience);
    const skipped = await this.countClientsWithoutEmail(audience);

    if (!this.resend) {
      this.logger.warn('Campaign send skipped — Resend not configured');
      return { queued: 0, skipped, batches: 0, errors: ['Resend not configured'] };
    }

    const html = this.wrapInTemplate(body);
    const errors: string[] = [];
    let queued = 0;

    const chunks = chunk(emails, BATCH_SIZE);

    for (const batch of chunks) {
      try {
        await this.resend.batch.send(
          batch.map((to) => ({ from: this.from, to, subject, html })),
        );
        queued += batch.length;
        this.logger.log(`Campaign batch sent: ${batch.length} emails`);
      } catch (err: any) {
        const msg: string = err?.message ?? String(err);
        this.logger.error(`Campaign batch failed: ${msg}`);
        errors.push(msg);
      }
    }

    return { queued, skipped, batches: chunks.length, errors };
  }

  private async resolveAudience(audience: SendCampaignDto['audience']): Promise<string[]> {
    if (audience === 'completed') {
      const clients = await this.prisma.client.findMany({
        where: {
          email: { not: null },
          bookingRequests: { some: { status: 'COMPLETED' } },
        },
        select: { email: true },
        distinct: ['email'],
      });
      return clients.map((c) => c.email!);
    }

    if (audience === 'active') {
      const clients = await this.prisma.client.findMany({
        where: {
          email: { not: null },
          bookingRequests: {
            some: {
              status: { in: ['PENDING_CONSULT', 'CONSULT_APPROVED', 'TATTOO_SCHEDULED'] },
            },
          },
        },
        select: { email: true },
        distinct: ['email'],
      });
      return clients.map((c) => c.email!);
    }

    // 'all'
    const clients = await this.prisma.client.findMany({
      where: { email: { not: null } },
      select: { email: true },
      distinct: ['email'],
    });
    return clients.map((c) => c.email!);
  }

  private async countClientsWithoutEmail(
    audience: SendCampaignDto['audience'],
  ): Promise<number> {
    const base =
      audience === 'completed'
        ? { bookingRequests: { some: { status: 'COMPLETED' as const } } }
        : audience === 'active'
          ? {
              bookingRequests: {
                some: {
                  status: {
                    in: ['PENDING_CONSULT', 'CONSULT_APPROVED', 'TATTOO_SCHEDULED'] as ('PENDING_CONSULT' | 'CONSULT_APPROVED' | 'TATTOO_SCHEDULED')[],
                  },
                },
              },
            }
          : {};

    return this.prisma.client.count({ where: { ...base, email: null } });
  }

  private wrapInTemplate(content: string): string {
    const studioAddress = this.config.get<string>('STUDIO_ADDRESS') ?? '';
    const studioPhone = this.config.get<string>('STUDIO_PHONE') ?? '';
    const studioWebsite = this.config.get<string>('STUDIO_WEBSITE') ?? '';

    const footerParts: string[] = [];
    if (studioAddress) footerParts.push(studioAddress);
    if (studioPhone) footerParts.push(studioPhone);
    if (studioWebsite)
      footerParts.push(
        `<a href="${studioWebsite}" style="color:#888;">${studioWebsite}</a>`,
      );

    const footer = `
      <div style="margin-top:40px;padding-top:20px;border-top:1px solid #e5e5e5;font-size:12px;color:#888;line-height:1.6;">
        <strong>${this.studioName}</strong><br/>
        ${footerParts.join(' &bull; ')}
      </div>`;

    return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1.0"/></head>
<body style="margin:0;padding:0;background:#f9f9f9;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9f9f9;padding:40px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
        <tr>
          <td style="background:#111;padding:24px 32px;">
            <h1 style="margin:0;color:#fff;font-size:20px;letter-spacing:1px;">${this.studioName}</h1>
          </td>
        </tr>
        <tr>
          <td style="padding:32px;">
            ${content}
            ${footer}
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
  }
}

function chunk<T>(arr: T[], size: number): T[][] {
  const result: T[][] = [];
  for (let i = 0; i < arr.length; i += size) result.push(arr.slice(i, i + size));
  return result;
}
