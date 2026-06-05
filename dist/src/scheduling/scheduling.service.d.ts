import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { CreateConsultSlotDto } from './dto/create-consult-slot.dto';
import { AssignConsultSlotDto } from './dto/assign-consult-slot.dto';
import { CreateTattooSessionDto } from './dto/create-tattoo-session.dto';
import { UpdateTattooSessionDto } from './dto/update-tattoo-session.dto';
export declare class SchedulingService {
    private readonly prisma;
    private readonly email;
    constructor(prisma: PrismaService, email: EmailService);
    createConsultSlot(dto: CreateConsultSlotDto): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        date: Date;
        maxCount: number;
    }>;
    listConsultSlots(): Promise<{
        id: string;
        date: Date;
        maxCount: number;
        bookedCount: number;
        available: boolean;
        createdAt: Date;
    }[]>;
    deleteConsultSlot(id: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        date: Date;
        maxCount: number;
    }>;
    assignConsultSlot(bookingId: string, dto: AssignConsultSlotDto): Promise<{
        consultSlot: {
            id: string;
            date: Date;
            maxCount: number;
        } | null;
        id: string;
        status: import("@prisma/client").$Enums.BookingStatus;
        consultSlotId: string | null;
    }>;
    getAvailableConsultDates(): Promise<{
        availableDates: string[];
    }>;
    createTattooSession(bookingId: string, dto: CreateTattooSessionDto): Promise<{
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
    listTattooSessions(bookingId: string): Promise<({
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
    updateTattooSession(sessionId: string, dto: UpdateTattooSessionDto): Promise<{
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
    completeTattooSession(sessionId: string): Promise<{
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
    deleteTattooSession(sessionId: string): Promise<{
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
