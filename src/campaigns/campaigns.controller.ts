import { Controller, Post, Body, UseGuards, HttpCode } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { CampaignsService } from './campaigns.service';
import { SendCampaignDto } from './dto/send-campaign.dto';

@ApiTags('Admin / Campaigns')
@ApiBearerAuth('admin-jwt')
@Controller('admin/campaigns')
@UseGuards(AuthGuard('jwt'))
export class CampaignsController {
  constructor(private readonly service: CampaignsService) {}

  @Post('send')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Send a bulk email campaign',
    description:
      'Fetches client emails based on the chosen audience filter, then sends the campaign via Resend batch API (100 recipients per batch). Returns send stats.',
  })
  @ApiResponse({
    status: 200,
    description: 'Campaign dispatched. Returns queued count, skipped count, batch count, and any errors.',
    schema: {
      example: { queued: 243, skipped: 17, batches: 3, errors: [] },
    },
  })
  send(@Body() dto: SendCampaignDto) {
    return this.service.sendCampaign(dto);
  }
}
