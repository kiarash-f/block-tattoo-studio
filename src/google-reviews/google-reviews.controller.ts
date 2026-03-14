import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { GoogleReviewsService } from './google-reviews.service';

@ApiTags('Public / Reviews')
@Controller('public/reviews')
export class GoogleReviewsController {
  constructor(private readonly service: GoogleReviewsService) {}

  @Get('google')
  @ApiOperation({
    summary: 'Get cached Google reviews for the studio',
  })
  getReviews() {
    return this.service.getReviews();
  }
}
