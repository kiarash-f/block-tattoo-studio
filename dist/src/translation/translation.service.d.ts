import { ConfigService } from '@nestjs/config';
export declare class TranslationService {
    private readonly config;
    private translator;
    constructor(config: ConfigService);
    translate(text: string, targetLang: string): Promise<string>;
}
