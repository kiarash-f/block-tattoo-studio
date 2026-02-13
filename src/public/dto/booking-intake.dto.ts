import {
  IsBoolean,
  IsDateString,
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum BudgetRange {
  UNDER_200 = 'UNDER_200',
  _200_400 = '_200_400',
  _400_700 = '_400_700',
  _700_1000 = '_700_1000',
  _1000_1500 = '_1000_1500',
  _1500_2000 = '_1500_2000',
  OVER_2000 = 'OVER_2000',
}

export enum IntakeSource {
  DIRECT = 'DIRECT',
  INSTAGRAM = 'INSTAGRAM',
  FACEBOOK = 'FACEBOOK',
  GOOGLE = 'GOOGLE',
  TIKTOK = 'TIKTOK',
  OTHER = 'OTHER',
}

export class ClientDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  firstName: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  lastName: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  // keep permissive; validate strictly later if you want
  @IsOptional()
  @IsString()
  @MaxLength(40)
  phone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  instagram?: string;

  @IsOptional()
  @IsDateString()
  birthday?: string;
}

export class MedicalDeclarationDto {
  @IsBoolean()
  hasAllergies: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  allergiesDetails?: string;

  @IsBoolean()
  hasSkinCondition: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  skinConditionDetails?: string;

  @IsBoolean()
  isPregnantOrNursing: boolean;

  @IsBoolean()
  hasHeartCondition: boolean;

  @IsBoolean()
  hasDiabetes: boolean;

  @IsBoolean()
  takesBloodThinners: boolean;

  @IsBoolean()
  takesMedication: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  medicationDetails?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  otherNotes?: string;
}

export class ConsentDto {
  @IsBoolean()
  isAdultConfirmed: boolean;

  @IsBoolean()
  termsAccepted: boolean;

  @IsBoolean()
  privacyAccepted: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  fullName?: string;

  @IsOptional()
  @IsDateString()
  signedAt?: string;
}

export class BookingRequestDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  description: string;

  @IsEnum(BudgetRange)
  budgetRange: BudgetRange;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  placement?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  sizeDescription?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  styleNotes?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  referencesNotes?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  preferredArtistName?: string;

  // if client doesn't pick an artist => studioChooses defaults true
  @IsOptional()
  @IsBoolean()
  studioChooses?: boolean;

  // tracking (optional, can also be auto-filled from query/headers)
  @IsOptional()
  @IsEnum(IntakeSource)
  source?: IntakeSource;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  utmCampaign?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  utmAdset?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  utmAd?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  referrer?: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  landingPath?: string;
}

export class CreateBookingIntakeDto {
  @ValidateNested()
  @Type(() => ClientDto)
  client: ClientDto;

  @ValidateNested()
  @Type(() => BookingRequestDto)
  bookingRequest: BookingRequestDto;

  @ValidateNested()
  @Type(() => MedicalDeclarationDto)
  medicalDeclaration: MedicalDeclarationDto;

  @ValidateNested()
  @Type(() => ConsentDto)
  consent: ConsentDto;
}
