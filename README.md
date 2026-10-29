# SpaceNet — AI-Driven ISP CRM & NOC Platform

SpaceNet is an intelligent, automated Customer Relationship Management (CRM) and Network Operations Center (NOC) platform tailored for high-density internet service providers.

## Core Features & Views

1. **Dashboard Overview**:
   - Executive KPIs: Total inbound chat volume, AI automation rate (81%+), escalated tickets, and sales inbound pipeline.
   - Live telemetry chart: Weekly complaint and incident velocity with AI auto-resolution tracking.
   - NOC core health metrics (GPON OLT rings, anycast DNS latency, optical signal levels).
   - Live stream feed of autonomous AI agent actions.

2. **Unified Omnichannel Inbox**:
   - Integrates multi-channel customer communications: WhatsApp, Facebook Messenger, Website Chat, and Telegram.
   - Dynamic AI Suggested Replies chips for one-click customer resolution.
   - Telemetry-assisted troubleshooting (optical Rx dBm, ONT ping, packet loss).
   - Real-time handoff between AI Copilot and Tier-III Human Support NOC engineers.
   - Multilingual AI response support (English, Bangla, Banglish).

3. **Support Tickets Desk**:
   - Tabular ticket management with real-time filtering (Issue category, priority, status).
   - Detailed Ticket Telemetry Modal with hardware diagnostics and instant "Open Chat in Unified Inbox" handover.
   - One-click resolution and dynamic ticket creation.

4. **Sales & Leads Pipeline**:
   - 3-column Kanban board (New Leads, Contacted, Pending Contract).
   - AI Lead Scoring (Intent score, bandwidth demand, fiber node availability).
   - Quick triggers: AI Phone Outreach, Instant Quote generation via WhatsApp, SLA packet delivery, and follow-up reminders.

5. **Network Outages & Emergency Broadcast**:
   - Severity Level 1 trunk sever alert banner.
   - Interactive Emergency SMS / Push Broadcast modal with AI churn-prevention copy targeting impacted subscriber nodes.
   - SFP loopback testing and optical telemetry sweeps.

---

## Getting Started

### Prerequisites
- Node.js (v18+)
- npm

### Installation & Run

```bash
# Clone the repository
git clone https://github.com/lEVI2889/spacenet.git
cd spacenet

# Install dependencies
npm install

# Start local development server
npm run dev
```

Visit `http://localhost:5173/` in your browser to view the interactive demo.

### Build for Production

```bash
npm run build
```
Production assets are generated in the `dist/` directory.
