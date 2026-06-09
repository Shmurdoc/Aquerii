# Marketing Hub — Frontend Design

## Overview

The Marketing module manages email campaigns, templates, and audience segments. It's a basic marketing tool — not Mailchimp, not HubSpot. The scope is deliberately constrained: campaign creation + launch, email template editing, and segment building. No automation, no A/B testing, no analytics beyond campaign stats.

## Architecture

### Routes

```
/workspaces/{workspaceId}/marketing                    → CampaignsPage (default)
/workspaces/{workspaceId}/marketing/campaigns          → CampaignsPage
/workspaces/{workspaceId}/marketing/campaigns/{id}     → CampaignDetailPage (read-only stats after launch?)
/workspaces/{workspaceId}/marketing/email-templates    → EmailTemplatesPage
/workspaces/{workspaceId}/marketing/segments           → SegmentsPage
```

### Component Tree

```
CampaignsPage
├── CampaignsToolbar
│   ├── SearchInput (searches campaign name)
│   ├── StatusFilter (draft, scheduled, sending, sent)
│   └── CreateCampaignButton → CreateCampaignModal
├── CampaignList
│   └── CampaignCard (x N, grid layout)
│       ├── CampaignName
│       ├── StatusBadge (colored: draft=gray, scheduled=blue, sending=yellow, sent=green)
│       ├── ScheduleDate (if scheduled) / SentDate (if sent)
│       ├── StatsCompact (sent count, open rate, click rate — only if sent)
│       ├── LaunchButton (only if status=draft)
│       └── EditButton / DeleteButton
├── [CreateCampaignModal]
│   ├── Name (required)
│   ├── EmailTemplate (dropdown of existing templates)
│   ├── Segment (dropdown of existing segments or "All contacts")
│   ├── ScheduleDate (optional — empty means send immediately)
│   └── Create / Cancel
├── Empty: "No campaigns yet. Create your first campaign."
├── Loading: 6 skeleton cards (2-row × 3-col grid, pulse)
└── Error: banner + retry

CampaignDetailPage
├── CampaignHeader
│   ├── CampaignName (editable)
│   ├── Status (badge)
│   └── Actions: Duplicate, Delete
├── CampaignDetails
│   ├── Template used (link)
│   ├── Segment targeted (link)
│   ├── Schedule / sent timestamp
│   └── Launch button (if draft)
├── CampaignStats
│   ├── StatCardRow
│   │   ├── Sent (count)
│   │   ├── Opened (count + rate)
│   │   ├── Clicked (count + rate)
│   │   ├── Bounced (count + rate)
│   │   └── Unsubscribed (count + rate)
│   └── OverTimeChart (line chart: opens/clicks day-by-day during campaign)
│       └── X: date, Y: count. Toggle series: opens, clicks, bounces.
├── Loading: skeleton header + 5 skeleton stat cards + skeleton chart area
├── Error: banner + retry
└── Note: If status=draft, show "Launch campaign to see stats" placeholder — don't show empty stats

EmailTemplatesPage
├── TemplatesToolbar
│   ├── SearchInput
│   ├── CategoryFilter
│   └── CreateTemplateButton → TemplateEditor (modal or full page)
├── TemplateList (grid of template cards)
│   └── TemplateCard
│       ├── Thumbnail (rendered preview — tiny iframe or screenshot)
│       ├── TemplateName
│       ├── Category badge
│       ├── Updated date
│       └── Edit / Delete
├── [TemplateEditor]
│   ├── Name (input)
│   ├── Subject (input — email subject line)
│   ├── Category (dropdown)
│   ├── Body (rich text editor)
│   │   ├── Basic formatting: bold, italic, headings, lists, links, images
│   │   ├── Variable insertion button → dropdown of contact fields
│   │   │   └── {{contact.first_name}}, {{contact.last_name}}, {{contact.email}}, etc
│   │   └── Preview mode (phone + desktop toggle)
│   ├── Save / Cancel
│   └── CRITIQUE: Template editor is using a rich text editor for email HTML. That means:
│       - No responsive email layout support (email clients strip CSS)
│       - No MJML or HTML source editing
│       - No test email send
│       - No spam score check
│       For a basic tool this is acceptable, but call it what it is: a rich text editor that emits
│       messy HTML that will render inconsistently across email clients. If the target is real
│       email campaigns, this needs MJML compilation + test send.
├── Empty: "No email templates yet. Create the first template."
├── Loading: 6 skeleton cards with thumbnail placeholder blocks
└── Error: banner + retry

SegmentsPage
├── SegmentsToolbar
│   ├── SearchInput
│   └── CreateSegmentButton → SegmentBuilder (modal)
├── SegmentList
│   └── SegmentCard (name, filter count, contact count, updated date, edit/delete)
├── [SegmentBuilder] (modal, multi-step or form)
│   ├── Name (required)
│   ├── Filters (AND-combined, can add multiple)
│   │   ├── FilterRow 1: Tags [contains / does not contain] [tag select] [x remove]
│   │   ├── FilterRow 2: Lifecycle stage [is / is not] [dropdown: subscriber, lead, etc]
│   │   ├── FilterRow 3: Lead score [between] [min] [max]
│   │   ├── FilterRow 4: Created date [after / before / between] [date picker]
│   │   └── Add filter button (dropdown of available field types)
│   ├── ContactCountPreview ("X contacts match these filters" — auto-updates as filters change)
│   ├── Save / Cancel
│   └── CRITIQUE: The segment builder sends filter criteria to the backend and expects a
│       `POST /api/marketing/segments` to store + process them. But there's no documented
│       preview endpoint like `POST /api/marketing/segments/preview` that returns contact count
│       without saving. The "ContactCountPreview" feature in the builder requires this endpoint.
│       Without it, users save a segment blindly without knowing how many contacts it targets.
│       A campaign launched to a segment with 0 contacts is a silent failure.
├── Empty: "No segments yet. Create your first segment."
├── Loading: 5 skeleton cards
└── Error: banner + retry
```

## Data Flow

| Action | Endpoint | Optimistic | Notes |
|---|---|---|---|
| List campaigns | GET /api/marketing/campaigns | No | Paginated if needed |
| Create campaign | POST /api/marketing/campaigns | Yes | |
| Update campaign | PUT .../campaigns/{id} | Yes | |
| Delete campaign | DELETE .../campaigns/{id} | Yes | |
| Launch campaign | POST .../campaigns/{id}/launch | Yes | status → 'sending' immediately |
| Get campaign stats | GET .../campaigns/{id}/stats | No | Poll every 10s if status=sending |
| List templates | GET /api/marketing/email-templates | No | |
| Create template | POST /api/marketing/email-templates | Yes | |
| Update template | PUT .../email-templates/{id} | Yes | |
| Delete template | DELETE .../email-templates/{id} | Yes | |
| List segments | GET /api/marketing/segments | No | |
| Create segment | POST /api/marketing/segments | Yes | |
| Update segment | PUT .../segments/{id} | Yes | |
| Delete segment | DELETE .../segments/{id} | Yes | |

### Campaign Launch Flow

1. User clicks "Launch" on a draft campaign.
2. Confirmation modal: "Send [campaign name] to [N] contacts? This cannot be undone."
3. On confirm → POST /api/marketing/campaigns/{id}/launch.
4. Optimistically update status to 'sending'.
5. Poll GET /api/marketing/campaigns/{id}/stats every 10s until status changes to 'sent'.
6. During sending: show stat card progress (sent: 342 / 1000).
7. On error: revert status, show error toast.

**CRITIQUE:** There is no campaign send scheduling documented. The `POST /launch` endpoint presumably starts sending immediately. What about scheduled campaigns? The Campaign model has a `scheduled_date` field implied by the UI but there's no documented scheduler. If `scheduled_date` is set, the UI should show a schedule badge and the launch should be a no-op (the backend scheduler picks it up). But there's no scheduler endpoint documented.

### Campaign Stats Polling

Stats must poll the backend when campaign is in 'sending' status. The endpoint `GET /api/marketing/campaigns/{id}/stats` returns:

```json
{
  "sent": 342,
  "opened": 156,
  "clicked": 89,
  "bounced": 3,
  "unsubscribed": 1,
  "daily_breakdown": [
    { "date": "2026-05-25", "opens": 120, "clicks": 67 },
    { "date": "2026-05-26", "opens": 36, "clicks": 22 }
  ]
}
```

Polling stops when `status === 'sent'` or `status === 'failed'`.

## Loading / Empty / Error States

### Campaign List
- **Loading:** 6 skeleton grid cards.
- **Empty:** "No campaigns. Create your first campaign." + CTA.
- **Error:** Banner + retry.

### Campaign Detail
- **Loading:** Skeleton header + 5 stat cards (each a square pulse) + chart skeleton (rectangular pulse).
- **Not launched yet:** Show campaign info + "Launch campaign to see performance" with illustration. Do NOT show empty zero stats — that's confusing.
- **Error:** Banner + retry. Preserve campaign data that was already loaded.

### Email Templates
- **Loading:** 6 skeleton cards with thumbnail placeholder.
- **Empty:** "No templates. Create the first template." + CTA.
- **Error:** Banner + retry.

### Segments
- **Loading:** 5 skeleton cards.
- **Empty:** "No segments. Create the first segment." + CTA.
- **Error:** Banner + retry.

## Performance

| Concern | Strategy |
|---|---|
| Template list (50+) | Client-side cached, fetched once per session. Not paginated — templates are small. |
| Campaign stats chart | Use lightweight charting (Chart.js or recharts). Don't re-render on every poll — append data points. |
| Segment contact count preview | Debounce filter changes by 300ms before calling preview API. Cancel in-flight requests on new change. |
| Template preview iframe | Sandbox the iframe. Set `srcDoc` from template HTML. Don't inject into parent DOM. |

## Accessibility

- Campaign status badges: add `aria-label="Status: Sent"`.
- Stat cards: proper heading hierarchy (`<h3>` for stat title).
- Chart: provide data table beneath chart as fallback for screen readers.
- Template editor: ensure all formatting buttons have `aria-label`.
- Segment builder: add/remove filter rows — announce "Filter added" / "Filter removed" via aria-live.

## CRITIQUE: Weak Ideas & Risks

1. **There is no email sending infrastructure documented.** The campaign launch endpoint presumably triggers sending, but how? Does the backend integrate with SendGrid, SES, SMTP? There's no provider config endpoint. Without it, `POST /launch` is a stub that flips a status flag and does nothing.

2. **Template rendering is undefined.** Templates are stored as rich text HTML, but email clients don't support modern CSS. Who handles the transformation from editor HTML to email-safe HTML? If the frontend sends raw editor output, emails will look broken in Outlook, Gmail, and Apple Mail. **Fix:** The backend should process templates through MJML or an HTML-to-email converter before sending. The frontend should send semantic blocks (or MJML directly), not HTML.

3. **No A/B testing.** Every marketing tool needs at least basic A/B testing (subject line, content variant). Without it, campaigns are blind. Not required for v1 but must be architecturally possible — the template should support variants.

4. **No unsubscribe management.** Campaigns generate unsubscribes but there's no unsubscribe list, no suppression list, no compliance (CAN-SPAM/GDPR) management. The Unsubscribe stat exists but there's nowhere to manage it. Need `GET /api/marketing/unsubscribes` + `POST /api/marketing/suppressions`.

5. **Segment preview needs a dedicated endpoint.** As noted above, without `POST /api/marketing/segments/preview`, the segment builder's contact count preview is guesswork. This must be added.

6. **No campaign reporting beyond basic stats.** Click tracking requires individual link tracking — which means your backend needs to rewrite links in the email body at send time. Is that happening? If not, "Clicked" will always be 0. **Call out:** ask backend team how links are tracked. Without link wrapping, click stats are fake.

7. **Email template variable insertion is fragile.** The UI inserts `{{contact.first_name}}` into the editor text. But rich text editors (especially contentEditable-based ones) handle raw text + variables poorly — users might accidentally break the template syntax by editing around it. Consider using a structured template builder instead of a free-text editor.
