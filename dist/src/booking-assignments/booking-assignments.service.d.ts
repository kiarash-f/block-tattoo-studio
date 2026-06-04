import { PrismaService } from '../prisma/prisma.service';
import { CreateBookingAssignmentDto } from './dto/create-booking-assignment.dto';
import { UpdateBookingAssignmentDto } from './dto/update-booking-assignment.dto';
export declare class BookingAssignmentsService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    create(bookingRequestId: string, dto: CreateBookingAssignmentDto): Promise<{
        artist: {
            id: string;
            email: string | null;
            displayName: string;
            createdAt: Date;
            updatedAt: Date;
            status: import("@prisma/client").$Enums.ArtistStatus;
            phone: string | null;
            handle: string | null;
            slug: string | null;
            studioId: string | null;
            bio: string | null;
            bioDe: string | null;
            bioEn: string | null;
            avatarUrl: string | null;
            coverUrl: string | null;
        };
        station: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            name: string;
            status: import("@prisma/client").$Enums.StationStatus;
            studioId: string | null;
            code: string | null;
        } | null;
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        role: import("@prisma/client").$Enums.AssignmentRole;
        bookingRequestId: string;
        artistId: string;
        stationId: string | null;
        startsAt: Date | null;
        endsAt: Date | null;
        note: string | null;
    }>;
    list(bookingRequestId: string): Promise<({
        artist: {
            id: string;
            email: string | null;
            displayName: string;
            createdAt: Date;
            updatedAt: Date;
            status: import("@prisma/client").$Enums.ArtistStatus;
            phone: string | null;
            handle: string | null;
            slug: string | null;
            studioId: string | null;
            bio: string | null;
            bioDe: string | null;
            bioEn: string | null;
            avatarUrl: string | null;
            coverUrl: string | null;
        };
        station: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            name: string;
            status: import("@prisma/client").$Enums.StationStatus;
            studioId: string | null;
            code: string | null;
        } | null;
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        role: import("@prisma/client").$Enums.AssignmentRole;
        bookingRequestId: string;
        artistId: string;
        stationId: string | null;
        startsAt: Date | null;
        endsAt: Date | null;
        note: string | null;
    })[]>;
    update(bookingRequestId: string, assignmentId: string, dto: UpdateBookingAssignmentDto): Promise<{
        artist: {
            id: string;
            email: string | null;
            displayName: string;
            createdAt: Date;
            updatedAt: Date;
            status: import("@prisma/client").$Enums.ArtistStatus;
            phone: string | null;
            handle: string | null;
            slug: string | null;
            studioId: string | null;
            bio: string | null;
            bioDe: string | null;
            bioEn: string | null;
            avatarUrl: string | null;
            coverUrl: string | null;
        };
        station: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            name: string;
            status: import("@prisma/client").$Enums.StationStatus;
            studioId: string | null;
            code: string | null;
        } | null;
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        role: import("@prisma/client").$Enums.AssignmentRole;
        bookingRequestId: string;
        artistId: string;
        stationId: string | null;
        startsAt: Date | null;
        endsAt: Date | null;
        note: string | null;
    }>;
    remove(bookingRequestId: string, assignmentId: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        role: import("@prisma/client").$Enums.AssignmentRole;
        bookingRequestId: string;
        artistId: string;
        stationId: string | null;
        startsAt: Date | null;
        endsAt: Date | null;
        note: string | null;
    }>;
    private parseAndValidateTimeRange;
}
