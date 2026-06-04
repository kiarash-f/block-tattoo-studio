import { ApiProperty } from '@nestjs/swagger';
import { WorkCardResponse } from './work-card.response';

class ArtistPublicResponse {
  @ApiProperty() id!: string;
  @ApiProperty({ nullable: true }) slug!: string | null;
  @ApiProperty({ nullable: true }) handle!: string | null;
  @ApiProperty() displayName!: string;
  @ApiProperty({ nullable: true }) avatarUrl!: string | null;
  @ApiProperty({ nullable: true }) coverUrl!: string | null;
  @ApiProperty({ nullable: true }) bio!: string | null;
}

class WorksPagedResponse {
  @ApiProperty() page!: number;
  @ApiProperty() limit!: number;
  @ApiProperty() total!: number;
  @ApiProperty() hasMore!: boolean;
  @ApiProperty({ type: [WorkCardResponse] }) items!: WorkCardResponse[];
}

export class ArtistPageResponse {
  @ApiProperty({ type: ArtistPublicResponse }) artist!: ArtistPublicResponse;
  @ApiProperty({ type: WorksPagedResponse }) works!: WorksPagedResponse;
}
