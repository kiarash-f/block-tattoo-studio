import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as deepl from 'deepl-node';

@Injectable()
export class TranslationService {
  private translator: deepl.Translator;

  constructor(private readonly config: ConfigService) {
    this.translator = new deepl.Translator(this.config.get<string>('DEEPL_API_KEY')!);
  }

  async translate(text: string, targetLang: string): Promise<string> {
    if (!text?.trim()) return text;
    const result = await this.translator.translateText(
      text,
      null,
      targetLang as deepl.TargetLanguageCode,
    );
    return result.text;
  }
}
