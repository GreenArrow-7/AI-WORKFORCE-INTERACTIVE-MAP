import type { Tool } from '@/lib/schemas';

/**
 * Closed registry. Agents reference tools by id, so the tool filter, the badge
 * list and search all share one vocabulary (§16).
 */
export const tools: Tool[] = [
  { id: 'tl-hubspot', name: 'HubSpot', category: 'crm' },
  { id: 'tl-salesforce', name: 'Salesforce', category: 'crm' },
  { id: 'tl-pipedrive', name: 'Pipedrive', category: 'crm' },
  { id: 'tl-gmail', name: 'Gmail', category: 'communication' },
  { id: 'tl-outlook', name: 'Outlook', category: 'communication' },
  { id: 'tl-slack', name: 'Slack', category: 'communication' },
  { id: 'tl-zoom', name: 'Zoom', category: 'communication' },
  { id: 'tl-twilio', name: 'Twilio', category: 'communication' },
  { id: 'tl-notion', name: 'Notion', category: 'documents' },
  { id: 'tl-gdrive', name: 'Google Drive', category: 'documents' },
  { id: 'tl-confluence', name: 'Confluence', category: 'documents' },
  { id: 'tl-docusign', name: 'DocuSign', category: 'documents' },
  { id: 'tl-airtable', name: 'Airtable', category: 'data' },
  { id: 'tl-sheets', name: 'Google Sheets', category: 'data' },
  { id: 'tl-snowflake', name: 'Snowflake', category: 'data' },
  { id: 'tl-segment', name: 'Segment', category: 'data' },
  { id: 'tl-linkedin', name: 'LinkedIn', category: 'marketing' },
  { id: 'tl-webflow', name: 'Webflow', category: 'marketing' },
  { id: 'tl-marketo', name: 'Marketo', category: 'marketing' },
  { id: 'tl-canva', name: 'Canva', category: 'marketing' },
  { id: 'tl-stripe', name: 'Stripe', category: 'finance' },
  { id: 'tl-quickbooks', name: 'QuickBooks', category: 'finance' },
  { id: 'tl-netsuite', name: 'NetSuite', category: 'finance' },
  { id: 'tl-ramp', name: 'Ramp', category: 'finance' },
  { id: 'tl-zendesk', name: 'Zendesk', category: 'support' },
  { id: 'tl-intercom', name: 'Intercom', category: 'support' },
  { id: 'tl-jira', name: 'Jira', category: 'engineering' },
  { id: 'tl-github', name: 'GitHub', category: 'engineering' },
  { id: 'tl-pagerduty', name: 'PagerDuty', category: 'engineering' },
  { id: 'tl-looker', name: 'Looker', category: 'analytics' },
  { id: 'tl-ga4', name: 'GA4', category: 'analytics' },
  { id: 'tl-greenhouse', name: 'Greenhouse', category: 'support' },
];
