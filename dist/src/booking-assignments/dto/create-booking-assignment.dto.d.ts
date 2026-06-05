import { AssignmentRole } from '@prisma/client';
export declare class CreateBookingAssignmentDto {
    artistId: string;
    stationId?: string;
    role?: AssignmentRole;
    startsAt?: string;
    endsAt?: string;
    note?: string;
}
