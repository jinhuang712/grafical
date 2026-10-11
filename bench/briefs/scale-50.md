# Architecture facts: grocer

This brief describes a fictional system of about 50 components, for the scale experiment (E4 in [EXPERIMENTS.md](../../EXPERIMENTS.md)). A good diagram of it may group or merge components; the brief lists everything so that nothing has to be invented.

grocer is an online grocery shop with same-day delivery. Six teams own six systems: storefront, catalog, orders, fulfilment, delivery and customer care.

## Callers

- `web-shop` and `shop-app` (mobile): customers.
- `picker-app` (handheld): warehouse pickers.
- `courier-app` (mobile): delivery couriers.
- `care-desk` (web): customer-care agents.
- `partner-feeds` (external): suppliers that send price and stock files every hour.

## Edge

- `cdn` (external): static assets and product images.
- `api-gateway`: routing, rate limits, token checks with `identity-svc`.
- `identity-svc`: sign-in, tokens. Users in `identity-db` (Postgres), sessions in `session-redis`.

## Storefront (storefront team)

- `storefront-bff`: the single API the web shop and the app call. It reads from `catalog-api`, `search-api`, `cart-svc` and `orders-api`.
- `search-api`: product search over `search-index` (Elasticsearch).
- `search-index` (Elasticsearch).
- `cart-svc`: carts in `cart-redis`. Reads prices from `pricing-svc`.
- `cart-redis` (Redis).
- `recommender`: "you may also like". Reads `orders-events` history from the `analytics-lake` once a day and serves results from `reco-cache` (Redis).
- `reco-cache` (Redis).

## Catalog (catalog team)

- `catalog-api`: products, categories and images. Reads `catalog-db` (Postgres) and `image-store` (object storage, served by the cdn).
- `catalog-db` (Postgres).
- `image-store` (object storage).
- `feed-importer`: reads `partner-feeds` every hour, updates `catalog-db`, `pricing-db` and `stock-db`, and publishes `catalog-changed` to Kafka.
- `pricing-svc`: current prices and promotions, from `pricing-db` (Postgres).
- `pricing-db` (Postgres).
- `indexer`: consumes `catalog-changed` and updates `search-index`.

## Orders (orders team)

- `orders-api`: places, changes and cancels orders. Writes `orders-db` (Postgres), reserves stock with `stock-svc`, takes payment through `payments-svc`, and publishes `order-placed` and `order-cancelled`.
- `orders-db` (Postgres).
- `payments-svc`: authorises and captures with `card-gateway` (external) and records each step in `payments-db` (Postgres).
- `payments-db` (Postgres).
- `card-gateway` (external).
- `invoicer`: consumes `order-delivered`, writes invoices to `invoice-store` (object storage) and emails them through `mailer`.
- `invoice-store` (object storage).

## Fulfilment (fulfilment team)

- `stock-svc`: stock per warehouse in `stock-db` (Postgres). Reservations expire after 30 minutes.
- `stock-db` (Postgres).
- `wave-planner`: consumes `order-placed`, groups orders into picking waves every 10 minutes and writes `waves-db` (Postgres).
- `waves-db` (Postgres).
- `picking-api`: what the picker app calls. Reads `waves-db`, updates `stock-svc` and publishes `order-picked`.
- `label-printer` (device in the warehouse): prints bag labels for picking-api.

## Delivery (delivery team)

- `route-planner`: consumes `order-picked`, plans courier routes with `maps-api` (external) and writes `routes-db` (Postgres).
- `routes-db` (Postgres).
- `courier-api`: what the courier app calls. Reads `routes-db`, records drops, publishes `order-delivered`.
- `courier-locations` (Kafka topic): courier GPS pings from the courier app, through courier-api.
- `eta-svc`: consumes `courier-locations`, computes arrival times and keeps them in `eta-redis`. storefront-bff reads it for "arriving in 12 minutes".
- `eta-redis` (Redis).
- `maps-api` (external).

## Customer care (care team)

- `care-api`: what care agents use. Reads `orders-api`, `payments-svc` and `courier-api`, and issues refunds through `payments-svc`.
- `tickets-db` (Postgres): care tickets.
- `mailer`: sends email through `mail-provider` (external).
- `mail-provider` (external).
- `push-svc`: consumes `order-picked` and `order-delivered` and sends app pushes through `push-provider` (external).
- `push-provider` (external).

## Shared

- `events` (Kafka cluster): `catalog-changed`, `order-placed`, `order-cancelled`, `order-picked`, `order-delivered`, `courier-locations`.
- `analytics-lake` (object storage): a nightly copy of every Kafka topic, used by the recommender and by finance reports.
