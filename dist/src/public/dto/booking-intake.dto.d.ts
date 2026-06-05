export declare enum BudgetRange {
    UNDER_200 = "UNDER_200",
    _200_400 = "_200_400",
    _400_700 = "_400_700",
    _700_1000 = "_700_1000",
    _1000_1500 = "_1000_1500",
    _1500_2000 = "_1500_2000",
    OVER_2000 = "OVER_2000"
}
export declare enum IntakeSource {
    DIRECT = "DIRECT",
    INSTAGRAM = "INSTAGRAM",
    FACEBOOK = "FACEBOOK",
    GOOGLE = "GOOGLE",
    TIKTOK = "TIKTOK",
    OTHER = "OTHER"
}
export declare enum BookingType {
    APPOINTMENT = "APPOINTMENT",
    CONSULTATION = "CONSULTATION",
    COVER_UP = "COVER_UP",
    WALK_IN = "WALK_IN"
}
export declare enum PreferredTimeOfDay {
    MORNING = "MORNING",
    AFTERNOON = "AFTERNOON",
    EVENING = "EVENING",
    ANY = "ANY"
}
export declare class ClientDto {
    firstName: string;
    lastName: string;
    email?: string;
    phone?: string;
    instagram?: string;
    birthday?: string;
}
export declare class MedicalDeclarationDto {
    hasAllergies: boolean;
    allergiesDetails?: string;
    hasSkinCondition: boolean;
    skinConditionDetails?: string;
    isPregnantOrNursing: boolean;
    hasHeartCondition: boolean;
    hasDiabetes: boolean;
    takesBloodThinners: boolean;
    takesMedication: boolean;
    medicationDetails?: string;
    otherNotes?: string;
}
export declare class ConsentDto {
    isAdultConfirmed: boolean;
    termsAccepted: boolean;
    privacyAccepted: boolean;
    fullName?: string;
    signedAt?: string;
}
export declare class BookingRequestDto {
    bookingType?: BookingType;
    consultDate: string;
    description: string;
    budgetRange: BudgetRange;
    placement?: string;
    sizeDescription?: string;
    styleNotes?: string;
    referencesNotes?: string;
    preferredArtistName?: string;
    studioChooses?: boolean;
    source?: IntakeSource;
    utmCampaign?: string;
    utmAdset?: string;
    utmAd?: string;
    referrer?: string;
    landingPath?: string;
    preferredDateFrom?: string;
    preferredDateTo?: string;
    preferredTimeOfDay?: PreferredTimeOfDay;
    preferredDaysNote?: string;
}
export declare class CreateBookingIntakeDto {
    client: ClientDto;
    bookingRequest: BookingRequestDto;
}
