import { ConfigService } from '@nestjs/config';
export interface BookingConfirmationData {
    to: string;
    clientName: string;
    bookingRequestId: string;
}
export interface ConsultConfirmationData {
    to: string;
    clientName: string;
    consultDate: Date;
}
export interface BookingRejectedData {
    to: string;
    clientName: string;
}
export interface SessionReminderData {
    to: string;
    clientName: string;
    sessionDate: Date;
    artistName: string;
}
export interface GuestArtistBookingConfirmationData {
    to: string;
    artistName: string;
    startDate: Date;
    endDate: Date;
    numberOfTables: number;
    numberOfDays: number;
    totalPrice: number;
    discountPercent: number;
}
export declare class EmailService {
    private readonly config;
    private readonly logger;
    private readonly resend;
    private readonly from;
    private readonly studioName;
    private readonly studioAddress;
    private readonly studioPhone;
    private readonly studioWebsite;
    constructor(config: ConfigService);
    private footer;
    private wrap;
    private send;
    sendBookingConfirmation(data: BookingConfirmationData): Promise<void>;
    sendConsultConfirmation(data: ConsultConfirmationData): Promise<void>;
    sendBookingRejected(data: BookingRejectedData): Promise<void>;
    sendGuestArtistBookingConfirmation(data: GuestArtistBookingConfirmationData): Promise<void>;
    sendSessionReminder(data: SessionReminderData): Promise<void>;
}
