# Architecture facts: catalog-sync and catalog-api

This brief describes a fictional system. It has the same shape and size as the private reference brief used for the MVP bar in [GOALS.md](../../GOALS.md), so results on the two are comparable. Items marked "unknown" or "inferred" are deliberately left open, as they would be in a real brief.

Both services are Go services owned by the Catalog team.

## How the two services relate

- catalog-sync is the **write side**: it turns upstream catalog changes into documents in MongoDB.
- catalog-api is the **read side**: a read-only API over those same MongoDB collections.
- The only coupling is the shared MongoDB. There is no RPC between them, no shared topic and no shared schema package. catalog-api copies the document schema and collection names by hand.

## catalog-sync

Two deployables:

- `catalog-relay` (tier 1, port 7101): consumes upstream broker topics, routes each message by line and writes it to catalog-sync's own Kafka topics, keyed `line:id`, with trace, lane and env headers. A Kafka write failure makes the broker retry. Bad data is acknowledged and dropped.
- `catalog-sync` (tier 2, port 7102): runs one streaming pipeline per line, reading those Kafka topics, and serves HTTP admin and ops endpoints. It also runs the relay in-process ("embedded relay", always on). Whether production also runs a separate relay pod: unknown.

Lines:

| Line | Code | Kafka topic |
|---|---|---|
| Goods (items, variants, offers) | 10 | `catalog_goods_v1` |
| Tickets | 20 | `catalog_tickets_v1` |

Upstream inputs, consumed by the relay:

- `ItemChangedTopic`, `VariantChangedTopic`, `OfferChangedTopic`: published by inventory-svc, pricing-svc and merchant-portal. They go to the Goods line.
- `SearchIndexTopic` (only source type 20) and `ticket_listing_increment_topic`: they go to the Tickets line.
- `UpstreamChangeTopic`: a generic envelope topic. Its real name is not final.

Pipeline stages on the Goods line: Kafka source → batch → scope filter (env and lane) → delay 30 s (waits for read-replica lag) → dedup by (level, id) → fetch from source → transform → persist to MongoDB → fanout (re-produces child variant and offer tasks onto `catalog_goods_v1`) → reinject failures → commit offsets. The Tickets line is the same without fanout. Delivery is at-least-once: offsets are committed after persist.

Retry and DLQ: failed records go to Kafka `catalog_retry_v1`. A retry runner sends them back to their origin topic when due. After 5 attempts a record goes to the MongoDB collection `catalog_dlq`. The DLQ is a Mongo collection, not a Kafka topic. Retry log: Mongo `catalog_retry`.

Source reads during fetch, all read-only:

- Postgres read replicas: Goods `goods_core` and `goods_content`, Tickets `tickets`.
- HTTP GET to `geo-svc` (region tree) and `i18n-svc` (translated text).
- Redis: name cache with a 10 min TTL. A Redis lock helper exists, but no caller was found.
- Service-to-service auth check via `auth-svc` on admin routes.

MongoDB writes:

- Goods: `goods_category`, `goods_region`, `goods_tag`, `goods_item`, `goods_variant`, `goods_offer`, `goods_item_content`, `goods_variant_content`, `goods_media`, plus the snapshots `goods_item_snapshot`, `goods_variant_snapshot` and `goods_offer_snapshot`.
- Tickets: `ticket_listings`, `ticket_backfill_job`.
- Control: `catalog_dlq`, `catalog_retry`, `full_load_job`.
- Database name: catalog-api's test config reads database `catalog`. Production names live in the config service (unknown).

Other entry points, all HTTP on `catalog-sync` under `/v1/catalog-sync/admin`:

- `POST|GET /correction/resync`: data correction. It re-produces IDs onto a line topic. Another service calls it (caller unknown).
- `/ops/full-load/run` and job routes: a full scan of the source replica, with job state in Mongo `full_load_job`. It either runs in-process or seeds item tasks onto the Kafka topic. There is no cron in the repo, so the trigger is external (unknown).
- `/ops/dlq/{peek,redrive,reopen,discard}`, `/ops/backfill`, `/ops/tickets/*`, `/ops/goods/*`, `/ops/debug/*`: operator tools.
- No gRPC server.

## catalog-api

Purpose: an internal, read-only API over the three-level catalog data (item → variant → offer, the Goods line) plus historical snapshots.

Inbound. There is no auth: callers send an `X-Caller` header that is only logged.

- gRPC `CatalogApiService` (port 7190 locally): `Ping`, `ListItemIds`, `ListItems`, `ListVariantIds`, `ListVariants`, `ListOfferIds`, `ListOffers`, `GetItemSnapshot`, `GetVariantSnapshot`, `GetOfferSnapshot`.
- HTTP on port 8080, with the same operations as GET routes under `/v1/catalog-api/`: `/item/list`, `/item/id-list`, `/variant/...`, `/offer/...`, `/snapshot/{item,variant,offer}`, `/pong`.
- Known callers: the promotions team (snapshots) and storefront services. The full list is unknown.
- No message consumers and no cron jobs.

Layers: gRPC and HTTP handlers → one application layer → service (assembly) → repo (MongoDB, `Find` and `FindOne` only), plus two HTTP adapters.

Data reads, MongoDB only, read-only, one cluster:

- Database `catalog`: the 9 `goods_*` collections and the 3 `goods_*_snapshot` collections written by catalog-sync.
- Database `inventory`: collection `stock` only, for price and stock state.

Outbound HTTP:

- `campaign-svc`: `POST campaign_tags` for campaign tags, in batches of 25. It degrades to empty tags on failure.
- `i18n-svc`: campaign text by key and locale, with an in-process cache (10 min) and a 1 s budget.
- Published-language list via the `locale` client library.

Request flow for `ListItems`: caller → handler (at most 20 IDs per batch) → `goods_item` → content, media, category, tag and region collections → `inventory.stock` → campaign-svc tags → translated text → assemble the response.

Snapshot flow: caller → `Get*Snapshot` (by time or by version) → `goods_*_snapshot` → assemble.
