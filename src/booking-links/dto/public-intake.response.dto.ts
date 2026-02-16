import { ApiProperty } from '@nestjs/swagger';

export class PublicUploadDto {
  @ApiProperty() id!: string;
  @ApiProperty() kind!: string;
  @ApiProperty() url!: string;
  @ApiProperty() createdAt!: string;
}

export class PublicIntakeResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() status!: string;

  @ApiProperty({ nullable: true }) placement!: string | null;
  @ApiProperty({ nullable: true }) sizeDescription!: string | null;
  @ApiProperty({ nullable: true }) styleNotes!: string | null;

  @ApiProperty() description!: string;
  @ApiProperty() budgetRange!: string;

  @ApiProperty({ nullable: true }) referencesNotes!: string | null;

  @ApiProperty({ nullable: true }) preferredArtistName!: string | null;
  @ApiProperty() studioChooses!: boolean;

  @ApiProperty({ type: [PublicUploadDto] }) uploads!: PublicUploadDto[];

  // If you want: include these only if safe in your schema
  @ApiProperty({ nullable: true }) medicalDeclaration?: any;
  @ApiProperty({ nullable: true }) consent?: any;
}
