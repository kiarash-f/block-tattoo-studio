import {
  registerDecorator,
  ValidationArguments,
  ValidationOptions,
} from 'class-validator';

/**
 * Cross-field range guard for YYYY-MM-DD string pairs: the decorated property
 * (range end) must be on/after the named start property and at most `maxDays`
 * days after it. Caps the unbounded per-day iteration in the guest-booking
 * availability/create paths (public, unauthenticated endpoints).
 *
 * Non-string or unparseable values pass here — @IsDateString owns
 * format errors so the client gets one clear message per problem.
 */
export function IsWithinDaysOf(
  startProperty: string,
  maxDays: number,
  validationOptions?: ValidationOptions,
) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isWithinDaysOf',
      target: object.constructor,
      propertyName,
      constraints: [startProperty, maxDays],
      options: validationOptions,
      validator: {
        validate(value: unknown, args: ValidationArguments) {
          const [startProp, days] = args.constraints as [string, number];
          const start = (args.object as Record<string, unknown>)[startProp];
          if (typeof value !== 'string' || typeof start !== 'string') {
            return true;
          }
          const startMs = Date.parse(start);
          const endMs = Date.parse(value);
          if (Number.isNaN(startMs) || Number.isNaN(endMs)) return true;

          const diffDays = (endMs - startMs) / 86_400_000;
          return diffDays >= 0 && diffDays <= days;
        },
        defaultMessage(args: ValidationArguments) {
          const [startProp, days] = args.constraints as [string, number];
          return `${args.property} must be on or after ${startProp} and at most ${days} days after it`;
        },
      },
    });
  };
}
