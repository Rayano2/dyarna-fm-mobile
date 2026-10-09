// Flutter explicitly sets an Accept header on its requests; some backends
// reject JSON bodies when Accept is left unset by the HTTP client, so we
// mirror the exact header Flutter sends on each surface.

// Accept: */* — posts, marketplace, tickets, and escalation-settings calls.
export const FLUTTER_HEADERS = { Accept: '*/*' };

// Accept: application/json — the polls endpoints use this instead.
export const JSON_ACCEPT_HEADERS = { Accept: 'application/json' };
