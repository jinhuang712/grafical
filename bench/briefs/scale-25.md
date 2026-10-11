# Architecture facts: dispatch

This brief describes a fictional system of about 25 components, for the scale experiment (E4 in [EXPERIMENTS.md](../../EXPERIMENTS.md)).

dispatch matches riders with drivers for a city taxi service. Three teams own three systems: booking, matching and payments.

## Callers

- `rider-app` and `driver-app` (mobile) talk to the `edge-gateway` over HTTPS. The driver app also keeps a WebSocket open to `driver-socket`.
- `ops-console` (web) is used by the operations team. It calls `booking-api` and `payments-api` through the gateway.

## Edge

- `edge-gateway`: TLS, rate limits and routing to the systems behind it. It checks tokens with `auth-svc`.
- `auth-svc`: issues and checks tokens. Stores sessions in `auth-redis`.
- `driver-socket`: holds driver WebSockets and forwards location pings to the `locations` Kafka topic.

## Booking (booking team)

- `booking-api`: creates and cancels trips. Writes `trips-db` (Postgres) and publishes `trip-requested` and `trip-cancelled` to Kafka.
- `trips-db` (Postgres): trips and their states.
- `fare-estimator`: called by booking-api to quote a price. Reads zone prices from `zones-db` (Postgres) and live surge factors from `surge-cache` (Redis).
- `zones-db` (Postgres): city zones and base prices.

## Matching (matching team)

- `location-ingest`: consumes `locations`, keeps each driver's last position in `geo-index` (Redis with geo search).
- `geo-index` (Redis): driver positions.
- `matcher`: consumes `trip-requested`, finds nearby free drivers in `geo-index`, offers the trip to one driver through `driver-socket`, and publishes `trip-matched` when a driver accepts.
- `surge-calculator`: every minute counts open requests and free drivers per zone and writes surge factors to `surge-cache`.
- `surge-cache` (Redis): surge factor per zone.

## Payments (payments team)

- `payments-api`: consumes `trip-matched` and `trip-completed`, holds and then captures the fare with `card-processor` (external), and writes `ledger-db`.
- `ledger-db` (Postgres): every charge, refund and payout.
- `payout-batch` (nightly job): pays drivers from `ledger-db` through `bank-transfers` (external).
- `card-processor` (external): card authorisation and capture.
- `bank-transfers` (external): driver payouts.

## Shared

- `events` (Kafka cluster): the topics `locations`, `trip-requested`, `trip-cancelled`, `trip-matched` and `trip-completed`.
- `notify-svc`: consumes `trip-matched` and `trip-completed` and sends push messages to both apps through `push-provider` (external).
- `push-provider` (external): mobile push.
