import type { Query } from '@tanstack/react-query';

/**
 * Central query-key factory. Every React Query cache key in the app is
 * built from here so list/detail/lookup keys can't drift apart between
 * the hooks that read them and the mutations that invalidate them.
 *
 * Keys are grouped by backend service (tms / community / bms) and emit
 * the exact same tuples the codebase used as literals before the
 * factory existed — prefix invalidations (e.g. `queryKeys.tms.tickets`)
 * rely on that hierarchy.
 */
export const queryKeys = {
  ums: {
    legalTerms: (locale: string) => ['ums', 'legal', 'terms', locale] as const,
    /**
     * Whether THIS user has accepted the current Terms document.
     *
     * Keyed by user id, and that is not optional: the response is
     * token-scoped, so a shared device that cached it under a parameterless
     * key would serve user A's "accepted: true" to user B and walk B past a
     * legally required gate. The id is the last segment so the whole feature
     * still invalidates from the `['ums','legal']` prefix.
     */
    legalTermsAcceptance: (userId: string | null) =>
      ['ums', 'legal', 'terms', 'acceptance', userId] as const,
  },
  /**
   * FM resident requests + residents (T8). All BMS `company-reps` / `residents`
   * endpoints, scoped server-side to the caller's company from the Bearer
   * principal, so no key carries a company id.
   */
  fmResidents: {
    /** Prefix covering every resident-request list. */
    requests: ['fm', 'resident-requests'] as const,
    requestList: (status: string | null, projectId: number | null, buildingCode: string | null) =>
      ['fm', 'resident-requests', status, projectId, buildingCode] as const,
    /** Prefix covering every building's unit list. */
    buildingUnitsAll: ['fm', 'building-units'] as const,
    buildingUnits: (buildingCode: string | undefined) =>
      ['fm', 'building-units', buildingCode] as const,
    /** Prefix covering every residents list. */
    residents: ['fm', 'residents-list'] as const,
    residentList: (projectId: number | null, buildingCode: string | null) =>
      ['fm', 'residents-list', projectId, buildingCode] as const,
    /** Prefix covering every resident detail. */
    residentDetails: ['fm', 'resident-details'] as const,
    residentDetail: (userId: string | undefined) => ['fm', 'resident-details', userId] as const,
    /** `GET api/bms/company-reps/dashboardInfo` (pending-requests count). */
    dashboardInfo: ['fm', 'dashboard-info'] as const,
  },
  tms: {
    /** Prefix covering every ticket list + detail cache. */
    tickets: ['tms', 'tickets'] as const,
    residentTickets: ['tms', 'tickets', 'resident'] as const,
    presidentAssignedTickets: ['tms', 'tickets', 'president', 'assigned'] as const,
    presidentRecentTickets: ['tms', 'tickets', 'president', 'recent'] as const,
    ticketDetail: (ticketNumber: string | undefined) =>
      ['tms', 'tickets', 'detail', ticketNumber] as const,
    ticketRating: (ticketNumber: string | undefined) =>
      ['tms', 'tickets', 'rating', ticketNumber] as const,
    ticketCategories: ['tms', 'ticket-categories'] as const,
    /** FM company ticket list, keyed by its filters (search, status, project, building, sort). */
    fmTicketList: (filters: object) => ['tms', 'tickets', 'fm-list', filters] as const,
    /** Comments by NUMERIC ticket id (the comments route takes the id, not the number). */
    ticketComments: (ticketId: number | undefined) =>
      ['tms', 'tickets', 'comments', ticketId] as const,
  },
  community: {
    /** Prefix covering every posts cache (feeds, details, comments, lookups). */
    posts: ['community', 'posts'] as const,
    /** Keep the scope union in sync with `FeedScope` in usePosts. */
    feed: (scope: 'all' | 'mine') => ['community', 'posts', scope] as const,
    postDetail: (postId: string | undefined) => ['community', 'posts', 'detail', postId] as const,
    postComments: (postId: string | undefined) =>
      ['community', 'posts', 'comments', postId] as const,
    postCategories: ['community', 'posts', 'categories'] as const,
    eventCategories: ['community', 'posts', 'event-categories'] as const,
    pollTypes: ['community', 'lookup', 'poll-types'] as const,
    /** Prefix covering every poll list, detail, and voters cache. */
    polls: ['community', 'polls'] as const,
    /**
     * `GET /api/v1/polls` is token-scoped — the server resolves the caller's
     * project itself — so the list key carries no project id, unlike
     * `facilityList`.
     */
    pollList: ['community', 'polls', 'list'] as const,
    pollDetail: (pollId: string | undefined) => ['community', 'polls', 'detail', pollId] as const,
    pollVoters: (pollId: string | undefined) => ['community', 'polls', 'voters', pollId] as const,
    /** Prefix covering every building-info list + detail cache. */
    buildingInfo: ['community', 'building-info'] as const,
    /**
     * `GET api/v1/building-info` takes NO parameters at all — the server
     * resolves the caller's project and building from the JWT
     * (`BuildingInfoController.java:77-87`) — so the list key carries no
     * project id, exactly like `pollList` and unlike `facilityList`. Adding
     * one here would imply a client-supplied scope the endpoint must never
     * accept.
     */
    buildingInfoList: ['community', 'building-info', 'list'] as const,
    buildingInfoDetail: (itemId: string | undefined) =>
      ['community', 'building-info', 'detail', itemId] as const,
    /**
     * The assistant kill switch. Parameterless for the same reason as
     * `buildingInfoList`: scope comes from the JWT, so there is nothing
     * client-supplied to key on. It sits under the `buildingInfo` prefix so
     * invalidating the feature clears it too.
     *
     * Only the STATUS is cached. A question is deliberately NOT a query — see
     * `useAssistantAsk` — so no key exists for one.
     */
    buildingInfoAssistantStatus: ['community', 'building-info', 'assistant', 'status'] as const,
    listings: ['community', 'marketplace', 'listings'] as const,
    listingDetail: (listingId: string | undefined) =>
      ['community', 'marketplace', 'listings', 'detail', listingId] as const,
    listingCategories: ['community', 'marketplace', 'listings', 'categories'] as const,
    myBlocks: ['community', 'blocks'] as const,
    /** Prefix covering every facility list, detail, and bookings cache. */
    facilities: ['community', 'facilities'] as const,
    facilityList: (projectId: string | undefined) =>
      ['community', 'facilities', 'list', projectId] as const,
    facilityDetail: (facilityId: string | undefined) =>
      ['community', 'facilities', 'detail', facilityId] as const,
    facilityBookings: (facilityId: string | undefined) =>
      ['community', 'facilities', 'bookings', facilityId] as const,
  },
  bms: {
    myProjects: ['bms', 'projects', 'my-projects'] as const,
    projectResidents: ['bms', 'project-residents'] as const,
    escalationSettings: (scopeKey: string | null) =>
      ['bms', 'escalation-settings', scopeKey] as const,
    buildingContacts: (buildingCode: string) =>
      ['bms', 'building', buildingCode, 'contacts'] as const,
    userBuildings: ['bms', 'building', 'user', 'buildings'] as const,
    /**
     * Prefix covering the notification inbox list AND the unread count, so
     * one invalidation refreshes both after a read / read-all.
     *
     * The endpoints live in BMS-TMS (`api/bms/notifications`), which is why
     * they sit in the `bms` group even though most rows describe tickets.
     */
    notifications: ['bms', 'notifications'] as const,
    notificationsList: ['bms', 'notifications', 'list'] as const,
    notificationsUnreadCount: ['bms', 'notifications', 'unread-count'] as const,
    /**
     * FM filter data (tickets, requests, residents): the rep's projects with
     * their buildings. One cache entry, fetched by `useProjectsBuildingsFilter`.
     */
    projectsBuildingsFilter: ['bms', 'company-reps', 'projects-buildings-filter'] as const,
    /** FM dashboard KPIs + top open tickets (`api/bms/company-reps/dashboardInfo`). */
    dashboardInfo: ['bms', 'company-reps', 'dashboard-info'] as const,
    /** Count of the rep's not-yet-completed todos, for the "My tasks" KPI. */
    todosActive: ['bms', 'todos', 'active-count'] as const,
  },
} as const;

// Keep in sync with FeedScope in usePosts. Mutation hooks (like, create,
// edit, poll) use feedQueryFilter to patch/invalidate every scope cache at
// once — if a new scope is added there, the filter picks it up automatically.
const FEED_SCOPES: ReadonlySet<string> = new Set(['all', 'mine']);

/**
 * Query filter matching every active `useFeed(scope)` cache. Mutations
 * that touch the feed (reactions, new posts, edits, polls) pass this to
 * `setQueriesData` / `invalidateQueries` so the patch reaches whichever
 * scope the user is on. Without it, calls keyed against the literal
 * `['community','posts']` silently no-op — every feed query lives at
 * `['community','posts', <scope>]`, not the bare prefix.
 */
export const feedQueryFilter = {
  queryKey: queryKeys.community.posts,
  predicate: (query: Query) =>
    query.queryKey.length === 3 && FEED_SCOPES.has(query.queryKey[2] as string),
};
