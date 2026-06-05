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
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminAnalyticsService = void 0;
const common_1 = require("@nestjs/common");
const luxon_1 = require("luxon");
const prisma_service_1 = require("../../prisma/prisma.service");
let AdminAnalyticsService = class AdminAnalyticsService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    tzOrDefault(tz) {
        return tz?.trim() ? tz.trim() : 'Europe/Berlin';
    }
    getUtcRangeForZonedDate(date, timezone) {
        const startLocal = luxon_1.DateTime.fromISO(date, { zone: timezone }).startOf('day');
        if (!startLocal.isValid) {
            throw new common_1.BadRequestException(`Invalid date or timezone: date=${date}, timezone=${timezone}`);
        }
        const endLocal = startLocal.plus({ days: 1 });
        return {
            startUtc: startLocal.toUTC().toJSDate(),
            endUtc: endLocal.toUTC().toJSDate(),
        };
    }
    getUtcRangeForZonedDateRange(from, to, timezone) {
        const startUtc = this.getUtcRangeForZonedDate(from, timezone).startUtc;
        const endUtc = this.getUtcRangeForZonedDate(to, timezone).endUtc;
        if (startUtc >= endUtc) {
            throw new common_1.BadRequestException(`Invalid range: from must be <= to (from=${from}, to=${to})`);
        }
        return { startUtc, endUtc };
    }
    async loadRows(q) {
        const timezone = this.tzOrDefault(q.timezone);
        const { startUtc, endUtc } = this.getUtcRangeForZonedDateRange(q.from, q.to, timezone);
        const includeWalkIn = q.includeWalkIn ?? true;
        const where = {
            createdAt: { gte: startUtc, lt: endUtc },
        };
        if (!includeWalkIn) {
            where.bookingType = { not: 'WALK_IN' };
        }
        const rows = await this.prisma.bookingRequest.findMany({
            where,
            select: {
                createdAt: true,
                status: true,
                cancelReason: true,
                approvedAt: true,
                completedAt: true,
                cancelledAt: true,
                source: true,
                bookingType: true,
                utmCampaign: true,
                utmAdset: true,
                utmAd: true,
            },
        });
        return { timezone, startUtc, endUtc, rows: rows };
    }
    async getOverview(q) {
        const { timezone, startUtc, endUtc, rows } = await this.loadRows(q);
        const total = rows.length;
        const approved = rows.filter((r) => !!r.approvedAt).length;
        const completed = rows.filter((r) => r.status === 'COMPLETED' || !!r.completedAt).length;
        const cancelled = rows.filter((r) => r.status === 'CANCELLED' || !!r.cancelledAt).length;
        const noShow = rows.filter((r) => r.status === 'CANCELLED' && r.cancelReason === 'NO_SHOW').length;
        const bySource = {};
        const byBookingType = {};
        for (const r of rows) {
            bySource[r.source] = (bySource[r.source] ?? 0) + 1;
            byBookingType[r.bookingType] = (byBookingType[r.bookingType] ?? 0) + 1;
        }
        return {
            timezone,
            range: { startUtc, endUtc },
            total,
            status: { approved, completed, cancelled, noShow },
            bySource,
            byBookingType,
        };
    }
    async getSources(q) {
        const { timezone, startUtc, endUtc, rows } = await this.loadRows(q);
        const counts = {};
        for (const r of rows)
            counts[r.source] = (counts[r.source] ?? 0) + 1;
        const items = Object.entries(counts)
            .map(([source, count]) => ({ source, count }))
            .sort((a, b) => b.count - a.count);
        return { timezone, range: { startUtc, endUtc }, total: rows.length, items };
    }
    async getUtm(q) {
        const { timezone, startUtc, endUtc, rows } = await this.loadRows(q);
        const dim = q.dimension;
        const getKey = (r) => {
            const v = dim === 'campaign'
                ? r.utmCampaign
                : dim === 'adset'
                    ? r.utmAdset
                    : r.utmAd;
            const trimmed = v?.trim();
            return trimmed ? trimmed : '(none)';
        };
        const counts = {};
        for (const r of rows) {
            const k = getKey(r);
            counts[k] = (counts[k] ?? 0) + 1;
        }
        const items = Object.entries(counts)
            .map(([key, count]) => ({ [dim]: key, count }))
            .sort((a, b) => b.count - a.count);
        return {
            timezone,
            range: { startUtc, endUtc },
            total: rows.length,
            dimension: dim,
            items,
        };
    }
    async getTimeseries(q) {
        const { timezone, startUtc, endUtc, rows } = await this.loadRows(q);
        const buckets = this.buildBuckets(q.from, q.to, q.granularity, timezone);
        const bucketMap = this.bucketsByKey(buckets);
        for (const r of rows) {
            const key = this.bucketKeyForDate(r.createdAt, q.granularity, timezone);
            const b = bucketMap.get(key);
            if (!b)
                continue;
            b.total++;
            if (r.approvedAt)
                b.approved++;
            if (r.status === 'COMPLETED' || r.completedAt)
                b.completed++;
            if (r.status === 'CANCELLED' || r.cancelledAt)
                b.cancelled++;
            if (r.status === 'CANCELLED' && r.cancelReason === 'NO_SHOW')
                b.noShow++;
        }
        buckets.sort((a, b) => a.startUtc.getTime() - b.startUtc.getTime());
        return {
            timezone,
            range: { startUtc, endUtc },
            granularity: q.granularity,
            items: buckets,
        };
    }
    buildBuckets(from, to, granularity, tz) {
        const fromStart = luxon_1.DateTime.fromISO(from, { zone: tz }).startOf('day');
        const toStart = luxon_1.DateTime.fromISO(to, { zone: tz }).startOf('day');
        if (!fromStart.isValid || !toStart.isValid) {
            throw new common_1.BadRequestException(`Invalid from/to or timezone: from=${from}, to=${to}, tz=${tz}`);
        }
        if (fromStart > toStart) {
            throw new common_1.BadRequestException(`Invalid range: from must be <= to (from=${from}, to=${to})`);
        }
        const buckets = [];
        if (granularity === 'day') {
            let cur = fromStart;
            while (cur <= toStart) {
                const next = cur.plus({ days: 1 });
                buckets.push({
                    key: cur.toFormat('yyyy-LL-dd'),
                    label: cur.toFormat('yyyy-LL-dd'),
                    startUtc: cur.toUTC().toJSDate(),
                    endUtc: next.toUTC().toJSDate(),
                    total: 0,
                    approved: 0,
                    completed: 0,
                    cancelled: 0,
                    noShow: 0,
                });
                cur = next;
            }
            return buckets;
        }
        if (granularity === 'month') {
            let cur = fromStart.startOf('month');
            const endMonth = toStart.startOf('month');
            while (cur <= endMonth) {
                const next = cur.plus({ months: 1 });
                buckets.push({
                    key: cur.toFormat('yyyy-LL'),
                    label: cur.toFormat('yyyy LLL'),
                    startUtc: cur.toUTC().toJSDate(),
                    endUtc: next.toUTC().toJSDate(),
                    total: 0,
                    approved: 0,
                    completed: 0,
                    cancelled: 0,
                    noShow: 0,
                });
                cur = next;
            }
            return buckets;
        }
        const startWeek = fromStart
            .startOf('week')
            .set({ weekday: 1 })
            .startOf('day');
        const endWeek = toStart.startOf('week').set({ weekday: 1 }).startOf('day');
        let cur = startWeek;
        while (cur <= endWeek) {
            const next = cur.plus({ weeks: 1 });
            const weekYear = cur.weekYear;
            const weekNumber = String(cur.weekNumber).padStart(2, '0');
            buckets.push({
                key: `${weekYear}-W${weekNumber}`,
                label: `${weekYear}-W${weekNumber}`,
                startUtc: cur.toUTC().toJSDate(),
                endUtc: next.toUTC().toJSDate(),
                total: 0,
                approved: 0,
                completed: 0,
                cancelled: 0,
                noShow: 0,
            });
            cur = next;
        }
        return buckets;
    }
    bucketKeyForDate(dateUtc, granularity, tz) {
        const dt = luxon_1.DateTime.fromJSDate(dateUtc, { zone: 'utc' }).setZone(tz);
        if (granularity === 'day')
            return dt.toFormat('yyyy-LL-dd');
        if (granularity === 'month')
            return dt.toFormat('yyyy-LL');
        const weekYear = dt.weekYear;
        const weekNumber = String(dt.weekNumber).padStart(2, '0');
        return `${weekYear}-W${weekNumber}`;
    }
    bucketsByKey(buckets) {
        const m = new Map();
        for (const b of buckets)
            m.set(b.key, b);
        return m;
    }
};
exports.AdminAnalyticsService = AdminAnalyticsService;
exports.AdminAnalyticsService = AdminAnalyticsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], AdminAnalyticsService);
//# sourceMappingURL=admin-analytics.service.js.map