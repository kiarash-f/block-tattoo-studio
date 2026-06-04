import { BookingsService } from "./bookings.service";
import { ListAppointmentsQueryDto } from "./dto/list-appointments.query.dto";
export declare class AdminAppointmentsController {
    private readonly bookings;
    constructor(bookings: BookingsService);
    list(query: ListAppointmentsQueryDto): Promise<{
        date: string;
        timezone: string;
        range: {
            startUtc: Date;
            endUtc: Date;
        };
        total: number;
        items: ({
            client: {
                id: string;
                email: string | null;
                createdAt: Date;
                updatedAt: Date;
                firstName: string;
                lastName: string;
                phone: string | null;
                instagram: string | null;
                birthday: Date | null;
            };
            assignments: ({
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
            })[];
            uploads: {
                id: string;
                createdAt: Date;
                bookingRequestId: string;
                secureUrl: string;
                kind: import("@prisma/client").$Enums.UploadKind;
                originalName: string | null;
                mimeType: string | null;
                bytes: number | null;
                cloudinaryPublicId: string;
                createdViaTokenId: string | null;
            }[];
        } & {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            description: string;
            consultDate: Date | null;
            placement: string | null;
            sizeDescription: string | null;
            styleNotes: string | null;
            budgetRange: import("@prisma/client").$Enums.BudgetRange;
            referencesNotes: string | null;
            preferredArtistName: string | null;
            studioChooses: boolean;
            preferredDateFrom: Date | null;
            preferredDateTo: Date | null;
            preferredTimeOfDay: import("@prisma/client").$Enums.PreferredTimeOfDay | null;
            preferredDaysNote: string | null;
            status: import("@prisma/client").$Enums.BookingStatus;
            clientId: string;
            source: import("@prisma/client").$Enums.IntakeSource;
            utmCampaign: string | null;
            utmAdset: string | null;
            utmAd: string | null;
            referrer: string | null;
            landingPath: string | null;
            adminNotes: string | null;
            internalStatusNote: string | null;
            reviewedAt: Date | null;
            reviewedByAdminId: string | null;
            checkedInAt: Date | null;
            checkedInByAdminId: string | null;
            inStudioCompletedAt: Date | null;
            bookingType: import("@prisma/client").$Enums.BookingType;
            consultSlotId: string | null;
            approvedAt: Date | null;
            completedAt: Date | null;
            cancelledAt: Date | null;
            cancelReason: import("@prisma/client").$Enums.CancelReason | null;
        })[];
    }>;
}
