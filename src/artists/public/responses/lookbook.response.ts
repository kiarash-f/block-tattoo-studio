import { ApiProperty } from '@nestjs/swagger';
import { LookbookArtistCardResponse } from './lookbook-artist-card.response';

export class LookbookResponse {
  @ApiProperty() page!: number;
  @ApiProperty() limit!: number;
  @ApiProperty() total!: number;
  @ApiProperty({ type: [LookbookArtistCardResponse] })
  items!: LookbookArtistCardResponse[];
}
