import { SchedulingService } from './scheduling.service';
import { CreateConsultSlotDto } from './dto/create-consult-slot.dto';
import { AssignConsultSlotDto } from './dto/assign-consult-slot.dto';
import { CreateTattooSessionDto } from './dto/create-tattoo-session.dto';
import { UpdateTattooSessionDto } from './dto/update-tattoo-session.dto';
export declare class AdminConsultSlotsController {
    private readonly service;
    constructor(service: SchedulingService);
    create(dto: CreateConsultSlotDto): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        date: Date;
        maxCount: number;
    }>;
    list(): Promise<{
        id: string;
        date: Date;
        maxCount: number;
        bookedCount: number;
        available: boolean;
        createdAt: Date;
    }[]>;
    remove(id: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        date: Date;
        maxCount: number;
    }>;
}
export declare class AdminBookingConsultController {
    private readonly service;
    constructor(service: SchedulingService);
    assign(id: string, dto: AssignConsultSlotDto): Promise<{
        consultSlot: {
            id: string;
            date: Date;
            maxCount: number;
        } | null;
        id: string;
        status: import("@prisma/client").$Enums.BookingStatus;
        consultSlotId: string | null;
    }>;
}
export declare class AdminTattooSessionsController {
    private readonly service;
    constructor(service: SchedulingService);
    create(id: string, dto: CreateTattooSessionDto): Promise<{
        artist: {
            id: string;
            displayName: string;
        };
        station: {
            id: string;
            name: string;
        } | null;
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        bookingRequestId: string;
        completedAt: Date | null;
        artistId: string;
        stationId: string | null;
        scheduledDate: Date;
        durationNote: string | null;
        notes: string | null;
    }>;
    list(id: string): Promise<({
        artist: {
            id: string;
            displayName: string;
        };
        station: {
            id: string;
            name: string;
        } | null;
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        bookingRequestId: string;
        completedAt: Date | null;
        artistId: string;
        stationId: string | null;
        scheduledDate: Date;
        durationNote: string | null;
        notes: string | null;
    })[]>;
}
export declare class AdminSessionActionsController {
    private readonly service;
    constructor(service: SchedulingService);
    update(sessionId: string, dto: UpdateTattooSessionDto): Promise<{
        artist: {
            id: string;
            displayName: string;
        };
        station: {
            id: string;
            name: string;
        } | null;
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        bookingRequestId: string;
        completedAt: Date | null;
        artistId: string;
        stationId: string | null;
        scheduledDate: Date;
        durationNote: string | null;
        notes: string | null;
    }>;
    complete(sessionId: string): Promise<{
        artist: {
            id: string;
            displayName: string;
        };
        station: {
            id: string;
            name: string;
        } | null;
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        bookingRequestId: string;
        completedAt: Date | null;
        artistId: string;
        stationId: string | null;
        scheduledDate: Date;
        durationNote: string | null;
        notes: string | null;
    }>;
    remove(sessionId: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        bookingRequestId: string;
        completedAt: Date | null;
        artistId: string;
        stationId: string | null;
        scheduledDate: Date;
        durationNote: string | null;
        notes: string | null;
    }>;
}
export declare class PublicAvailabilityController {
    private readonly service;
    constructor(service: SchedulingService);
    getAvailableDates(): Promise<{
        availableDates: string[];
    }>;
}
