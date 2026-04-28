# Inbound Email Webhook Setup

Ten dokument opisuje konfiguracje bezpiecznego webhooka dla endpointu email.

## 1) Zmienna srodowiskowa

Dodaj do pliku `.env`:

```env
WEBHOOK_SECRET=twoj_bardzo_silny_tajny_token
```

Webhook oczekuje naglowka `x-webhook-token` i porownuje go z `WEBHOOK_SECRET`.

## 2) Przykladowy poprawny payload JSON

```json
{
  "from": "Lead Test <lead@example.com>",
  "to": "owner@example.com",
  "subject": "Pytanie o oferte",
  "text": "Dzien dobry, prosze o kontakt."
}
```

Wymagane pola:
- `from`
- `to`
- `subject`
- `text` lub `html`

Opcjonalnie mozna przekazac:
- `ownerId` (musi odpowiadac adresowi `to`)

## 3) Przykladowy test cURL (localhost)

```bash
curl -X POST "http://localhost:3000/api/webhooks/email" \
  -H "Content-Type: application/json" \
  -H "x-webhook-token: twoj_bardzo_silny_tajny_token" \
  -d '{
    "from": "lead@example.com",
    "to": "owner@example.com",
    "subject": "Nowa wiadomosc",
    "text": "To jest test webhooka."
  }'
```
