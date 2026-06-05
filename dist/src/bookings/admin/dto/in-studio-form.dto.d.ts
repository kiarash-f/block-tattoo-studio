export declare class InStudioMedicalDto {
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
export declare class InStudioConsentDto {
    isAdultConfirmed: boolean;
    termsAccepted: boolean;
    privacyAccepted: boolean;
    fullName?: string;
    signedAt?: string;
}
export declare class SubmitInStudioFormDto {
    medical: InStudioMedicalDto;
    consent: InStudioConsentDto;
}
