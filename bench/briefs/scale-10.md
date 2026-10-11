# Architecture facts: notify

This brief describes a fictional system of about 10 components, for the scale experiment (E4 in [EXPERIMENTS.md](../../EXPERIMENTS.md)).

notify sends account messages (sign-up, receipts, password resets) by email and SMS for a small web shop.

## Components

- `web-app`: the shop's web front end. It calls notify-api when a customer signs up, pays or asks for a password reset.
- `notify-api` (HTTP, port 8040): accepts a message request, looks up the customer's contact details in `user-svc`, renders the text from a template and puts a send job on the `send-jobs` queue.
- `user-svc`: owns customer profiles. notify-api reads email address, phone number and language from it over HTTP.
- `templates` (Postgres): message templates per type and language. notify-api reads them.
- `send-jobs` (RabbitMQ queue): one job per message to send.
- `sender` (worker): takes jobs from `send-jobs` and calls the right provider. It retries three times, then writes the job to the `dead-letters` table.
- `mail-provider` (external): sends email over its HTTPS API.
- `sms-provider` (external): sends SMS over its HTTPS API.
- `delivery-log` (Postgres, same server as `templates`): sender writes one row per attempt, and notify-api reads it to answer "was it sent?".
- `scheduler` (cron): every night it asks notify-api to resend messages that failed with a temporary error.

## Flows

- Send: web-app → notify-api → user-svc and templates → send-jobs → sender → mail-provider or sms-provider → delivery-log.
- Status: web-app → notify-api → delivery-log.
- Nightly resend: scheduler → notify-api.
