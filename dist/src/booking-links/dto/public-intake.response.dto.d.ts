export declare class PublicUploadDto {
    id: string;
    kind: string;
    url: string;
    createdAt: string;
}
export declare class PublicIntakeResponseDto {
    id: string;
    status: string;
    placement: string | null;
    sizeDescription: string | null;
    styleNotes: string | null;
    description: string;
    budgetRange: string;
    referencesNotes: string | null;
    preferredArtistName: string | null;
    studioChooses: boolean;
    uploads: PublicUploadDto[];
    medicalDeclaration?: any;
    consent?: any;
}
