import {
  IsArray,
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  ArrayNotEmpty,
} from 'class-validator';

export enum BookingLinkScope {
  INTAKE_CONTINUE = 'INTAKE_CONTINUE',
  UPLOAD = 'UPLOAD',
  VIEW = 'VIEW',
}

export class CreateBookingLinkDto {
  @IsArray()
  @ArrayNotEmpty()
  @IsEnum(BookingLinkScope, { each: true })
  scopes!: BookingLinkScope[];

  // ISO string, example: new Date(Date.now() + 72*3600*1000).toISOString()
  @IsDateString()
  expiresAt!: string;

  @IsOptional()
  @IsString()
  revokeReason?: string; 
}
