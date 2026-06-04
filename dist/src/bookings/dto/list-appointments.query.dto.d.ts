import { BookingStatus, BookingType } from '@prisma/client';
export declare class ListAppointmentsQueryDto {
    date: string;
    timezone?: string;
    status?: BookingStatus;
    bookingType?: BookingType;
    artistId?: string;
    stationId?: string;
}
