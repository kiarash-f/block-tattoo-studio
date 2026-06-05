import { PublicService } from './public.service';
export declare class PublicController {
    private readonly publicService;
    constructor(publicService: PublicService);
    bookingIntake(body: Record<string, string>, files: Express.Multer.File[], query: any, headers: Record<string, string>): Promise<{
        bookingRequestId: string;
        status: import("@prisma/client").$Enums.BookingStatus;
        createdAt: Date;
    }>;
    getAvailability(month: string): Promise<{
        month: string;
        days: {
            date: string;
            status: "closed" | "open" | "busy";
            count: number;
        }[];
    }>;
}
