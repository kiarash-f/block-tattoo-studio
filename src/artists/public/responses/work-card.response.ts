import { ApiProperty } from '@nestjs/swagger';

export class WorkCardResponse {
  @ApiProperty() id!: string;
  @ApiProperty() title!: string;
  @ApiProperty() coverUrl!: string;
  @ApiProperty({ type: [String] }) tags!: string[];
  @ApiProperty() createdAt!: string;
}