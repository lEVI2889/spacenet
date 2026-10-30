# SpaceNet AI CRM — Module 01 (Task 1) Handoff

**Module:** 01 — Unified Inbox & Omnichannel
**Task:** Task 1 — Structured Mock Data Contract & Dynamic Thread List
**Status:** Completed & Empirically Validated
**Date:** 2026-10-30
**Owner:** Rohan (Customer-Facing & Support)
**Collaborator:** Adnan (Operations & Admin)

---

## 1. Summary of Changes

Task 1 replaces the hardcoded, static thread cards in the Unified Inbox with dynamic, state-driven rendering powered by a normalized in-memory data contract. It establishes stable conversation and customer identifiers while preserving existing Stitch UI design, CSS utility tokens, cross-module hooks, and message simulation behavior.

---

## 2. Modified Files

* [`index.html`](file:///Users/levi/Programming/SpaceNet/index.html)
  * **Markup Updates:**
    * Left column: Added `id="inbox-search-input"` with `oninput="handleInboxSearch(this.value)"` to the chat filter bar. Replaced static thread card HTML inside `<div id="inbox-thread-list">` with a clean dynamic injection target.
    * Right column: Added `id="chat-customer-avatar"` and `id="chat-circuit-plan"` to ensure customer avatar initials, circuit ID, and package name reactively update when selecting different threads.
  * **Script Updates:**
    * Defined canonical `conversations` array with normalized fields (`conversationId`, `customerId`, `type`, `status`, etc.).
    * Created `customerConversations` backward-compatibility adapter map.
    * Added `renderThreadList()`, `selectConversation()`, `handleInboxSearch()`, and safe HTML escaping `escapeHtml()`.
    * Upgraded `sendChatMessage()` to persist outbound and simulated customer replies in `conv.messages` across thread switching.
    * Upgraded `filterInbox()` to filter dynamically based on data attributes rather than customer name string matching.

---

## 3. Data Structure Contract

Each conversation record conforms to the following schema:

```javascript
{
  conversationId: "CONV-WA-8832",   // Canonical conversation ID: CONV-<CHANNEL>-<ID>
  customerId: "CUST-8832",           // Canonical customer ID: CUST-<ID>
  key: "alex",                       // Legacy router key
  displayId: "#8832",                // Customer UI display ID
  customerName: "Alex Rivera",
  channel: "whatsapp",               // Lowercase channel key ('whatsapp' | 'facebook' | 'web' | 'telegram' | 'instagram')
  channelLabel: "WhatsApp",
  channelBadge: "WA",
  channelColor: "bg-secondary text-on-secondary",
  badgeColor: "bg-secondary-fixed text-on-secondary-fixed",
  type: "dm",                        // 'dm' | 'comment'
  status: "ai_handling",             // 'ai_handling' | 'human_takeover'
  unread: false,
  circuitId: "SPN-FBR-0941",
  plan: "Fiber 500Mbps",
  planBadge: "Fiber 500M",
  planBadgeColor: "text-secondary",
  tag: {
    label: "AI Diagnostics",
    icon: "auto_awesome",
    bg: "bg-tertiary-fixed text-on-tertiary-fixed"
  },
  lastMessageTime: "Just now",
  messages: [
    { id: "m-alx-1", sender: "customer", text: "...", time: "10:41 AM" },
    { id: "m-alx-2", sender: "telemetry", opticalRx: "-19.2 dBm", ping: "11.4 ms", loss: "0.00%", text: "..." },
    { id: "m-alx-3", sender: "ai", text: "...", time: "10:42 AM" },
    { id: "m-alx-4", sender: "customer", text: "...", time: "10:44 AM" }
  ],
  suggestions: [
    "I have applied channel auto-optimization on your 5GHz band. Please test your speed now!",
    "Speed test indicates 492 Mbps to your gateway. Let's inspect local Wi-Fi channels.",
    "I have scheduled a North Sector field tech dispatch for 2:00 PM if drops persist."
  ]
}
```

---

## 4. Implemented Functions

| Function | Scope & Purpose |
| :--- | :--- |
| `escapeHtml(str)` | Prevents XSS by sanitizing dynamic message/preview content before rendering into HTML. |
| `renderThreadList()` | Renders filtered conversation cards into `#inbox-thread-list` with active selection highlights, latest message previews, and metadata tags. Renders an empty state if no chats match. |
| `selectConversation(convId)` | Updates `currentConversationId` and `currentCustomerKey`, toggles active DOM styling across thread cards, and triggers `renderCustomerConversation()`. |
| `selectCustomer(custKey, rowEl)` | Backward-compatibility wrapper proxying to `selectConversation(custKey)`, preserving existing ticket-to-chat navigation (`goToChatFromTicket`). |
| `handleInboxSearch(val)` | Live search input handler supporting case-insensitive matching across customer names, customer IDs, conversation IDs, circuit IDs, plans, and message histories. |
| `filterInbox(ch, btn)` | Channel filter tab handler that updates `currentChannelFilter` and invokes `renderThreadList()`. |
| `renderCustomerConversation(idOrKey)` | Re-renders the right chat pane (customer name, avatar, ID, circuit/plan, message stream, and AI reply chips) for the selected conversation. |
| `sendChatMessage()` | Appends outbound staff messages to `conv.messages` and triggers simulated customer follow-ups that persist in state across conversation switching. |

---

## 5. Empirical Validation & Test Results

* **Vite Production Build:** Verified with `npm run build` — compiled cleanly in 71ms with zero errors.
* **Dynamic Rendering:** Verified initial render creates exactly 4 thread cards with correct active styling on the first item (`Alex Rivera`).
* **Search Filtering:**
  * Search by Name (`"Sarah"`): Successfully filters to 1 match (`Sarah Jenkins`).
  * Search by Customer ID (`"1092"`): Successfully filters to 1 match (`Marcus Vance`).
  * Search by Conversation ID (`"CONV-TG-7721"`): Successfully filters to 1 match (`Elena Rostov`).
  * Search by Message Text (`"video calls"`): Successfully filters to 1 match (`Alex Rivera`).
  * Search without Match (`"nonexistent123"`): Returns 0 matches and displays the `"No conversations found"` empty state.
* **Channel Filtering:**
  * Filter `'whatsapp'`: 1 match (`Alex Rivera`).
  * Filter `'facebook'`: 1 match (`Sarah Jenkins`).
  * Filter `'all'`: Restores all 4 conversations.
* **Selection & Routing:**
  * Calling `selectConversation('CONV-FB-4491')` properly updates active conversation ID and right column header to `Sarah Jenkins` (`Office Pro 1Gbps`).
  * Calling `selectCustomer('alex')` successfully resolves via the backward-compatibility adapter.
* **State Persistence:**
  * Outbound staff message appends to `conv.messages` (count increments from 4 to 5) and updates the thread preview snippet.

---

## 6. Shared-Data Constraints & Collaboration Agreement (Rohan & Adnan)

1. **ID Conventions:**
   * Customer ID: `CUST-<number>` (e.g. `CUST-8832`) with display alias `#<number>` (e.g. `#8832`).
   * Conversation ID: `CONV-<CHANNEL>-<ID>` (e.g. `CONV-WA-8832`, `CONV-FB-4491`).
   * Circuit ID: `SPN-FBR-0941`, `SPN-OFF-2281`, `SPN-VDS-1092`, `SPN-CORP-7721`.
   * Ticket ID: `TKT-<number>` / `#TKT-<number>` (e.g. `#TKT-1042`).
2. **Cross-Module Deep Links:**
   * Tickets Desk (Adnan / Rohan): `goToChatFromTicket()` can now target either `customerId` or `conversationId` safely.
   * Sales & Leads (Adnan): Module 06 can inspect `conversation.leadCandidate` and customer contact details directly.
3. **Compatibility:**
   * Global `customerConversations` map remains available for any existing script or modal expecting the legacy dictionary format.

---

## 7. Remaining Tasks in Module 01

* **Task 2: Omnichannel Channels & Filter Pill Expansion** (PDF Feature 1)
  * Add Instagram channel pill to the filter strip.
  * Add Instagram DM sample conversation.
* **Task 3: Social Post Comments in Unified Context** (PDF Feature 2)
  * Add Facebook and Instagram public post comment thread fixtures.
  * Render parent post context preview banner above comment threads.
  * Add comment filter toggle (All / DMs / Comments).
* **Task 4: Per-Conversation Human Takeover & AI Handback** (PDF Features 7 & 8)
  * Track `status: 'ai_handling' | 'human_takeover'` per conversation.
  * Insert takeover/handback system audit messages into the chat stream.
  * Provide visual indicators in header and composer when human staff is active.
* **Task 5: Internal Private Notes System** (PDF Feature 12)
  * Add composer tab toggle: `[Customer Message]` vs `[Internal Note (Team Only)]`.
  * Render internal notes with distinct amber background, lock icon, and staff signature.
