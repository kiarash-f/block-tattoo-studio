import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsISO8601,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ValidateNested } from 'class-validator';

export class InStudioMedicalDto {
  @ApiProperty() @IsBoolean() hasAllergies!: boolean;
  @ApiPropertyOptional() @IsOptional() @IsString() allergiesDetails?: string;

  @ApiProperty() @IsBoolean() hasSkinCondition!: boolean;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  skinConditionDetails?: string;

  @ApiProperty() @IsBoolean() isPregnantOrNursing!: boolean;
  @ApiProperty() @IsBoolean() hasHeartCondition!: boolean;
  @ApiProperty() @IsBoolean() hasDiabetes!: boolean;
  @ApiProperty() @IsBoolean() takesBloodThinners!: boolean;

  @ApiProperty() @IsBoolean() takesMedication!: boolean;
  @ApiPropertyOptional() @IsOptional() @IsString() medicationDetails?: string;

  @ApiPropertyOptional() @IsOptional() @IsString() otherNotes?: string;
}

export class InStudioConsentDto {
  @ApiProperty() @IsBoolean() isAdultConfirmed!: boolean;
  @ApiProperty() @IsBoolean() termsAccepted!: boolean;
  @ApiProperty() @IsBoolean() privacyAccepted!: boolean;

  @ApiPropertyOptional({ description: 'Optional signature name' })
  @IsOptional()
  @IsString()
  fullName?: string;

  @ApiPropertyOptional({ description: 'Optional signature timestamp (ISO)' })
  @IsOptional()
  @IsISO8601()
  signedAt?: string; // store as Date in service
}

export class SubmitInStudioFormDto {
  @ApiProperty({ type: () => InStudioMedicalDto })
  @ValidateNested()
  @Type(() => InStudioMedicalDto)
  medical!: InStudioMedicalDto;

  @ApiProperty({ type: () => InStudioConsentDto })
  @ValidateNested()
  @Type(() => InStudioConsentDto)
  consent!: InStudioConsentDto;
}
