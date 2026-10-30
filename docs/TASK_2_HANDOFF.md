# SpaceNet AI CRM — Module 01 (Task 2) Handoff

**Module:** 01 — Unified Inbox & Omnichannel
**Task:** Task 2 — Omnichannel Channels & Filter Pill Expansion
**Status:** Complete & Empirically Validated
**Date:** 2026-10-30
**Owner:** Rohan (Customer-Facing & Support)
**Collaborator:** Adnan (Operations & Admin)
**Repository:** `https://github.com/lEVI2889/spacenet`

---

## 1. Summary of Changes

Task 2 expands the SpaceNet AI CRM Unified Inbox from four channels to all five canonical communication channels:
1. **Facebook Messenger** (`facebook`)
2. **Instagram** (`instagram`)
3. **WhatsApp** (`whatsapp`)
4. **Telegram** (`telegram`)
5. **Website Chat** (`web`)
plus the unfiltered view (`all`).

The implementation integrates:
* An **Instagram** channel filter pill (`data-channel="instagram"`) in the channel filter pill strip adhering to Stitch MD3 design tokens, with a distinct tertiary color indicator dot (`bg-tertiary`), clean horizontal pill layout, and smooth transitions.
* A realistic fictional Instagram direct message (DM) conversation fixture for **Farhan Ahmed** (`CUST-6210`, `CONV-IG-6210`) inquiring about the **Fiber Gamer 300M** package, complete with sub-5ms low-latency gaming routing details, Wi-Fi 6 gaming ONT specs, Banani coverage verification, and installation scheduling suggestions.
* Fully data-driven five-channel filtering with active state management.
* Combined search and channel filtering (intersection) with graceful empty states for both the thread list and the conversation stream.
* Intelligent auto-selection of the first visible conversation when switching filter categories or clearing searches.
* Cross-conversation message isolation ensuring that user messages and simulated replies in one thread never leak to others.
* Ticket-to-chat navigation resilience (`goToChatFromTicket`) resetting the active channel filter to `'all'` before selecting the target customer.

---

## 2. Files Modified

| File | Type | Changes |
| :--- | :--- | :--- |
| [`index.html`](file:///Users/levi/Programming/SpaceNet/index.html) | Existing HTML/JS | Added Instagram filter pill to `#inbox-filter-strip`, updated Dashboard KPI copy to reflect all 5 channels, added Farhan Ahmed (`CONV-IG-6210`) to `conversations`, added `renderEmptyChatState()`, upgraded `renderThreadList()` for visible thread selection and empty state orchestration, enhanced `filterInbox()` for robust pill activation, upgraded `sendChatMessage()` with gamer package follow-up logic and empty-state guarding, and updated `goToChatFromTicket()`. |
| [`TASK_2_HANDOFF.md`](file:///Users/levi/Programming/SpaceNet/TASK_2_HANDOFF.md) | Created Markdown | Task 2 comprehensive technical handoff, empirical evidence, and contract reference. |
| [`docs/TASK_2_HANDOFF.md`](file:///Users/levi/Programming/SpaceNet/docs/TASK_2_HANDOFF.md) | Created Markdown | Documentation mirror in `docs/`. |

---

## 3. Updated Mock Data Contract

The canonical `conversations` dataset now contains 5 records:

```javascript
// Newly added Instagram record:
{
  conversationId: 'CONV-IG-6210',
  customerId: 'CUST-6210',
  key: 'farhan',
  displayId: '#6210',
  customerName: 'Farhan Ahmed',
  channel: 'instagram',
  channelLabel: 'Instagram',
  channelBadge: 'IG',
  channelColor: 'bg-tertiary text-on-tertiary',
  badgeColor: 'bg-tertiary-fixed text-on-tertiary-fixed',
  type: 'dm',
  status: 'ai_handling',
  unread: false,
  circuitId: 'SPN-GAM-6210',
  plan: 'Fiber Gamer 300Mbps',
  planBadge: 'Fiber Gamer 300M',
  planBadgeColor: 'text-tertiary',
  tag: {
    label: 'Package Inquiry',
    icon: 'sports_esports',
    bg: 'bg-tertiary-fixed text-on-tertiary-fixed font-semibold'
  },
  lastMessageTime: '12m ago',
  messages: [
    {
      id: 'm-frh-1',
      sender: 'customer',
      text: 'Hey SpaceNet! Saw your Instagram story for the Fiber Gamer 300M package. Does it feature low-latency routing for competitive gaming, and is Banani covered?',
      time: '11:20 AM'
    },
    {
      id: 'm-frh-2',
      sender: 'ai',
      text: 'Hello Farhan! Thanks for reaching out via Instagram. Yes, our Fiber Gamer 300Mbps package includes dedicated fastpath gaming routing with sub-5ms latency to regional gaming clusters.<br><br>Banani Block B & C are fully covered on our GPON fiber ring. It comes with a Wi-Fi 6 gaming ONT with priority QoS. Would you like to reserve an installation slot for this week?',
      time: '11:22 AM'
    },
    {
      id: 'm-frh-3',
      sender: 'customer',
      text: 'Awesome! That latency is exactly what I need for Valorant. Do you have a slot open this Thursday afternoon?',
      time: '11:25 AM'
    }
  ],
  suggestions: [
    "Yes, we have a Thursday 3:00 PM installation slot open in Banani. Shall I reserve it for you?",
    "Sending the Fiber Gamer 300M spec sheet and monthly pricing breakdown (2,500 BDT/mo).",
    "Would you like our technician to set up static IP configuration during installation?"
  ]
}
```

### Complete 5-Channel Directory:

| Customer | Customer ID | Conversation ID | Channel | Plan | Circuit ID |
| :--- | :--- | :--- | :--- | :--- | :--- |
| Alex Rivera | `CUST-8832` | `CONV-WA-8832` | `whatsapp` | Fiber 500Mbps | `SPN-FBR-0941` |
| Sarah Jenkins | `CUST-4491` | `CONV-FB-4491` | `facebook` | Office Pro 1Gbps | `SPN-OFF-2281` |
| Farhan Ahmed | `CUST-6210` | `CONV-IG-6210` | `instagram` | Fiber Gamer 300Mbps | `SPN-GAM-6210` |
| Marcus Vance | `CUST-1092` | `CONV-WEB-1092` | `web` | Home Lite 100M | `SPN-VDS-1092` |
| Elena Rostov | `CUST-7721` | `CONV-TG-7721` | `telegram` | Fiber Gigabit | `SPN-CORP-7721` |

---

## 4. Relevant Function Changes

| Function | Modification Summary |
| :--- | :--- |
| `renderEmptyChatState()` | **New.** Renders a clean placeholder view in the right chat pane when no conversations match the active filter or search query. |
| `renderThreadList()` | **Upgraded.** Intersects `currentChannelFilter` and `currentSearchQuery`. If filtered results are empty, triggers empty states on both thread list and chat stream. If the current selection is hidden, switches selection to `filtered[0]` to ensure active thread synchronization without mutating data. |
| `filterInbox(ch, btn)` | **Upgraded.** Supports optional `btn` parameter (auto-resolves button by `[data-channel]`), maintains consistent `flex items-center gap-1 whitespace-nowrap` styling across all filter pills, and invokes `renderThreadList()`. |
| `sendChatMessage()` | **Upgraded.** Prevents message submission when in empty chat state. Adds contextual smart customer reply handling for gaming package/installation inquiries ("Thursday 3:00 PM works great! I have my NID copy ready..."). Preserves session message history in `conv.messages`. |
| `goToChatFromTicket()` | **Upgraded.** Automatically resets channel filter to `'all'` before selecting the customer so ticket-to-chat navigation never fails due to an active channel filter. |

---

## 5. Testing Evidence & Empirical Results

### Vite Production Build
```
> vite build
vite v8.3.5 building client environment for production...
✓ 3 modules transformed.
rendering chunks (1)...computing gzip size...
dist/index.html  124.86 kB │ gzip: 24.68 kB
✓ built in 71ms
```
* Status: **Zero errors, zero warnings.**

### Automated Test Suite Execution
* **Total Assertions:** 50/50 assertions passed in core test suite + 24/24 in comprehensive suite.
* **Test Verification Items:**
  1. `conversations` length is exactly 5.
  2. All 5 canonical channel keys present (`facebook`, `instagram`, `whatsapp`, `telegram`, `web`).
  3. `CONV-IG-6210` adheres to the normalized data contract with customer, channel, plan, message, and suggestion attributes.
  4. Backward compatibility adapter `customerConversations` successfully indexes Farhan via `CONV-IG-6210`, `farhan`, and `CUST-6210`.
  5. Selecting `'all'` renders all 5 conversations.
  6. Selecting `'instagram'` renders only Farhan Ahmed and auto-selects Farhan's chat.
  7. Selecting `'facebook'` renders only Sarah Jenkins and auto-selects Sarah's chat.
  8. Selecting `'whatsapp'` renders only Alex Rivera.
  9. Selecting `'telegram'` renders only Elena Rostov.
  10. Selecting `'web'` renders only Marcus Vance.
  11. Searching `"Farhan"` within Instagram filter returns Farhan.
  12. Searching `"Alex"` within Instagram filter returns 0 results and displays the empty state placeholder in both columns.
  13. Clearing search within Instagram filter restores Farhan.
  14. Message dispatch in Farhan's chat persists in `conv.messages` (outbound + simulated customer follow-up).
  15. Switching between Alex Rivera and Farhan Ahmed demonstrates zero message leakage.
  16. `goToChatFromTicket()` resets filter to `'all'` and selects customer.
  17. Hash routing and view switching between Dashboard, Unified Inbox, Tickets, Sales/Leads, and Outages function without errors.

---

## 6. Shared Data Constraints & Collaboration Agreement (Rohan & Adnan)

1. **Canonical Channel Identifiers:**
   * `facebook` — Facebook Messenger
   * `instagram` — Instagram DMs (and post comments in Task 3)
   * `whatsapp` — WhatsApp Business
   * `telegram` — Telegram Bot
   * `web` — SpaceNet Website Live Chat
2. **Identifier Standards Preserved:**
   * Customer ID: `CUST-<ID>` (e.g., `CUST-6210`)
   * Conversation ID: `CONV-<CHANNEL>-<ID>` (e.g., `CONV-IG-6210`)
   * Circuit ID: `SPN-<TYPE>-<ID>` (e.g., `SPN-GAM-6210`)
3. **Collaboration Boundary:**
   * No backend dependencies, no third-party framework migrations.
   * Adnan's Tickets, Sales/Leads, and Network Outages modules remain untouched and fully operable.
   * `docs/SHARED_DATA_CONTRACT.md` will be created during GitHub handoff preparation after Task 2 completion.

---

## 7. Remaining Tasks in Module 01

* **Task 3: Social Post Comments in Unified Context** (PDF Feature 2)
  * Facebook and Instagram public post comment thread fixtures.
  * Parent post context preview banner above comment threads.
  * Comment filter toggle (All / DMs / Comments).
* **Task 4: Per-Conversation Human Takeover & AI Handback** (PDF Features 7 & 8)
  * State tracking (`ai_handling` vs. `human_takeover`) per conversation.
  * Audit events inserted into chat history.
  * Visual indicators in header and message composer.
* **Task 5: Internal Private Notes System** (PDF Feature 12)
  * Dual-mode composer toggle: `[Customer Message]` vs `[Internal Note]`.
  * Amber styling, lock icon, and staff attribution for internal notes.
