"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var ChatService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChatService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const sdk_1 = __importDefault(require("@anthropic-ai/sdk"));
const SYSTEM_PROMPT = `
You are a friendly assistant for Ink & Soul Tattoo Studio, located at Habsburgerring 12, 50674 Köln, Germany.

ABOUT THE STUDIO:
- Name: Ink & Soul Tattoo Studio
- Address: Habsburgerring 12, 50674 Köln
- Phone: +49 221 98765432
- Opening hours: Tuesday to Saturday, 11:00 AM – 7:00 PM
- Website: https://inkandsoul-koeln.de
- Instagram: @inkandsoul.koeln

ARTISTS:
- Max Brenner — specializes in blackwork, geometric, and fine line tattoos
- Lena Voss — specializes in watercolor, botanical, and illustrative tattoos
- Studio also welcomes guest artists periodically

BOOKING TYPES:
- Consultation: First step for all new clients. Free of charge. Admin reviews your request and assigns a consult date. Max 3 consults per day.
- Appointment: For clients who have already had a consultation and are ready to get their tattoo.
- Cover-up: For covering existing tattoos. Requires a consultation first.
- Walk-in: Available for small, simple designs when artists have open slots.

PRICING (approximate):
- Small tattoos (under 10cm): starting from €80
- Medium tattoos: €150 – €400
- Large pieces / sleeves: €400 and up, often requires multiple sessions
- Cover-ups: priced individually, starting from €120
- Consultations are free

HOW BOOKING WORKS:
1. Client fills out the booking intake form on the website
2. Studio reviews the request within 1–2 business days
3. If approved, client receives an email with a consult date
4. Client comes in for consult — artist assesses the work
5. Tattoo session(s) are scheduled after consult

FREQUENTLY ASKED QUESTIONS:
- Do you accept walk-ins? Yes, for small designs when slots are available. Call ahead to check.
- How do I prepare for my tattoo? Stay hydrated, eat beforehand, wear comfortable clothing that gives access to the tattoo area.
- Do you do colour tattoos? Yes, both colour and black & grey.
- Is there parking nearby? Yes, street parking and a public parking garage on Neue Langgasse.
- Do you do piercings? No, tattoos only.
- What is the minimum age? 18 years old. ID required.
- Do I need a deposit? No deposit required to submit a booking request.

YOUR ROLE:
- Answer questions about the studio, artists, pricing, and booking process
- Help visitors understand which booking type is right for them
- If someone is ready to book, tell them to fill out the booking form on the website
- Keep answers short, friendly, and professional — 2 to 4 sentences max
- If you don't know something, say so honestly and suggest they call or DM on Instagram
- Never make up prices or availability — use the info above only
- Always respond in the same language the visitor uses (German or English)
- Do not discuss topics unrelated to the studio or tattoos
`;
let ChatService = ChatService_1 = class ChatService {
    config;
    logger = new common_1.Logger(ChatService_1.name);
    anthropic;
    constructor(config) {
        this.config = config;
        const apiKey = config.get('ANTHROPIC_API_KEY') ?? '';
        this.anthropic = new sdk_1.default({ apiKey });
    }
    async chat(dto) {
        const messages = [
            ...dto.history.map((m) => ({
                role: m.role,
                content: m.content,
            })),
            { role: 'user', content: dto.message },
        ];
        try {
            const response = await this.anthropic.messages.create({
                model: 'claude-haiku-4-5-20251001',
                max_tokens: 500,
                system: SYSTEM_PROMPT,
                messages,
            });
            const block = response.content[0];
            if (block.type !== 'text') {
                throw new Error('Unexpected response content type');
            }
            return { reply: block.text };
        }
        catch (err) {
            this.logger.error('Anthropic chat error', err);
            throw new common_1.InternalServerErrorException('Chat service unavailable');
        }
    }
};
exports.ChatService = ChatService;
exports.ChatService = ChatService = ChatService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], ChatService);
//# sourceMappingURL=chat.service.js.map