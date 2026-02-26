import { ApiProperty } from '@nestjs/swagger';
import { WorkCardResponse } from './work-card.response';

export class LookbookArtistCardResponse {
  @ApiProperty() id!: string;
  @ApiProperty({ nullable: true }) slug!: string | null;
  @ApiProperty() displayName!: string;
  @ApiProperty({ nullable: true }) avatarUrl!: string | null;
  @ApiProperty({ nullable: true }) coverUrl!: string | null;

  @ApiProperty() worksCount!: number;
  @ApiProperty({ type: [WorkCardResponse] }) latestWorks!: WorkCardResponse[];
}
