export declare enum BookingLinkScope {
    INTAKE_CONTINUE = "INTAKE_CONTINUE",
    UPLOAD = "UPLOAD",
    VIEW = "VIEW"
}
export declare class CreateBookingLinkDto {
    scopes: BookingLinkScope[];
    expiresAt: string;
    revokeReason?: string;
}
