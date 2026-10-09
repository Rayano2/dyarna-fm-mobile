import { logger } from '@/shared/lib/logger';

export interface MapperContext {
  feature: string;
  entity: string;
}

export interface MapperFailure {
  feature: string;
  entity: string;
  index: number;
  error: unknown;
  raw: unknown;
}

export interface MapperDropAggregate {
  feature: string;
  entity: string;
  total: number;
  dropped: number;
}

export interface MapperReporter {
  onItemFailure?: (failure: MapperFailure) => void;
  onAggregate?: (aggregate: MapperDropAggregate) => void;
}

// Swappable so production telemetry (Sentry, Crashlytics) can subscribe without
// touching feature code. Default reporter only logs in __DEV__.
const defaultReporter: Required<MapperReporter> = {
  onItemFailure: ({ feature, entity, index, error }) => {
    const message = error instanceof Error ? error.message : String(error);
    logger.warn(`[${feature}] map ${entity} failed at index ${index}: ${message}`);
  },
  onAggregate: ({ feature, entity, total, dropped }) => {
    logger.warn(`[${feature}] mapped ${total - dropped}/${total} ${entity}; ${dropped} dropped`);
  },
};

let activeReporter: Required<MapperReporter> = defaultReporter;

export function setMapperReporter(reporter: MapperReporter | null): void {
  if (!reporter) {
    activeReporter = defaultReporter;
    return;
  }
  activeReporter = {
    onItemFailure: reporter.onItemFailure ?? defaultReporter.onItemFailure,
    onAggregate: reporter.onAggregate ?? defaultReporter.onAggregate,
  };
}

export function safeMapList<T>(
  items: readonly unknown[],
  mapFn: (raw: unknown) => T,
  ctx: MapperContext,
): T[] {
  const mapped: T[] = [];
  for (const [index, raw] of items.entries()) {
    try {
      mapped.push(mapFn(raw));
    } catch (error) {
      activeReporter.onItemFailure({ ...ctx, index, error, raw });
    }
  }
  const dropped = items.length - mapped.length;
  if (dropped > 0) {
    activeReporter.onAggregate({ ...ctx, total: items.length, dropped });
  }
  return mapped;
}
