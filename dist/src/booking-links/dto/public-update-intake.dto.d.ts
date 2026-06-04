import { BudgetRange, PreferredTimeOfDay } from '@prisma/client';
export declare class PublicUpdateIntakeDto {
    placement?: string;
    sizeDescription?: string;
    styleNotes?: string;
    description?: string;
    budgetRange?: BudgetRange;
    referencesNotes?: string;
    preferredArtistName?: string;
    studioChooses?: boolean;
    preferredDateFrom?: string;
    preferredDateTo?: string;
    preferredTimeOfDay?: PreferredTimeOfDay;
    preferredDaysNote?: string;
}
