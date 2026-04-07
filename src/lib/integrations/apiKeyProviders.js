export const API_KEY_PROVIDER_CATALOG = [
  {
    id: "hubspot",
    label: "HubSpot",
    baseUrl: "https://api.hubapi.com",
  },
  {
    id: "slack",
    label: "Slack",
    baseUrl: "https://slack.com/api",
  },
  {
    id: "notion",
    label: "Notion",
    baseUrl: "https://api.notion.com",
  },
  {
    id: "airtable",
    label: "Airtable",
    baseUrl: "https://api.airtable.com",
  },
  {
    id: "stripe",
    label: "Stripe",
    baseUrl: "https://api.stripe.com",
  },
];

export function getApiKeyProviderConfig(providerId) {
  return API_KEY_PROVIDER_CATALOG.find((provider) => provider.id === providerId) || null;
}
