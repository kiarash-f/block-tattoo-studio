import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { GoogleReviewsService } from './google-reviews.service';

@ApiTags('Public / Reviews')
@Controller('public/reviews')
export class GoogleReviewsController {
  constructor(private readonly service: GoogleReviewsService) {}

  @Get('google')
  @ApiOperation({
    summary: 'Get cached Google reviews for the studio',
    description: 'Returns cached Google Maps reviews for the studio. Results are refreshed periodically to avoid exceeding API quota.',
  })
  @ApiResponse({ status: 200, description: 'List of Google reviews.' })
  getReviews() {
    return this.service.getReviews();
  }
}
