# System Architecture & Plan

## 1. Current System Context
The Quality Management System (QMS) is currently built as a full-stack application:
- **Backend**: NestJS with Prisma ORM, PostgreSQL (managed via Prisma), and JWT authentication.
- **Frontend**: Next.js (App Router) with Tailwind CSS, Lucide icons, Framer Motion for animations, and Sonner for notifications.
- **Primary Focus**: Support for **Manual Audits** is the current priority, while maintaining architecture for automated sampling/poka-yoke.

---

## 2. State Machines

### A) Audit Lifecycle (Current)
| From State | Trigger | To State | Conditions/Actions |
| :--- | :--- | :--- | :--- |
| `DRAFT` | Initial Save | `DRAFT` | Audit created manually without ticket reference. |
| `IN_PROGRESS` | Open for Scoring | `IN_PROGRESS` | **Poka-yoke**: Check if QA has other `IN_PROGRESS` audits. Set `startedAt`. |
| `IN_PROGRESS` | Submit | `SUBMITTED` | Validate scoring. Calculate `score`. Set `submittedAt`. |
| `SUBMITTED` | Release | `RELEASED` | Trigger Notification to Agent. Start **Agent SLA Timer**. |
| `RELEASED` | Dispute | `DISPUTED` | Agent challenges the score. |

### B) Dispute Lifecycle
| From State | Trigger | To State | Conditions/Actions |
| :--- | :--- | :--- | :--- |
| `PENDING_QA_REVIEW` | QA Review Reject | `QA_REJECTED` | Initial verdict is against the dispute. |
| `PENDING_QA_REVIEW` | QA Review Accept | `FINALIZED` | Verdict accepted. Score updated. |
| `QA_REJECTED` | Agent Re-appeal | `REAPPEALED` | Agent escalates to QA TL. |
| `REAPPEALED` | Final Review | `FINALIZED` | Final decision made by QA TL. |

---

## 3. Core Algorithms (Future Integration)

### A) Sampling Algorithm
*Note: This will take effect when integrated with external interaction databases.*
**Input**: `BatchId`, `CampaignConfig` (SamplingRate, StratificationConfig)
**Steps**:
1. **Load Tickets**: Fetch all `UploadedTicket` for the batch.
2. **Group**: Group tickets by `AgentId` + `Date`.
3. **Stratify**: Filter/group by channel (Chat: 60%, Voice: 40%).
4. **Calculate Target**: `TargetCount = ceil(TotalTickets * SamplingRate)`.
5. **Randomize & Select**: Shuffle and take top `TargetCount` tickets.
6. **Assign**: Round-robin distribution to active `CampaignQA` list.
7. **Persist**: Create `SampledTicket` records as `READY`.

### B) Poka-Yoke Lock (One Audit Per QA)
*Ensures focus and prevents cherry-picking.*
**Logic**:
1. **Database Constraint**: Unique index on `auditorId` where `status = 'IN_PROGRESS'`.
2. **Application Level**: Throw `BadRequestException` if a user attempts to start a new audit while another is `IN_PROGRESS`.

---

## 4. Implementation Structure

### Backend Modules (`/backend/src/modules`)
- `auth`: JWT Strategy, Login, and Role-based access control.
- `users` / `campaigns`: Management of EIDs, Project Codes, and Campaign settings.
- `forms`: Monitoring form engine (Versioning, Criteria, Categories).
- `audit`: Core scoring logic for manual and sampled audits.
- `dispute`: Workflow for handling score challenges.
- `release`: Logic for bulk or manual release of audited scorecards.
- `ticket-ingest` / `sampling`: Infrastructure for bulk ticket uploads and automated selection.
- `sla-engine`: Business-day calculations for response deadlines.
- `notifications`: Internal alerts (Audit released, Dispute opened).

### Frontend Structure (`/frontend/app`)
- `(dashboard)`: Grouped routes using a shared layout.
    - `/dashboard`: High-level metrics (WIP).
    - `/audits`: List and management of all audit records.
    - `/evaluate`: The "Evaluation Form" where scoring happens.
    - `/dossier`: User and team directory management.
    - `/forms`: Rubric configuration and design.
    - `/disputes`: Workflow tracking for active disputes.
    - `/configuration`: Campaign and system-wide settings.
- `/login`: Minimalist, premium login interface.

---

## 5. Next Steps
1. **Database Stability**: Transition to a more robust local or managed database setup.
2. **Dashboard Visualization**: Implement charts for Campaign performance.
3. **Bulk Actions**: Add ability to bulk-upload users via CSV into the Dossier.
4. **Enhanced Rubric Builder**: Improve the UX for defining critical vs. non-critical criteria.

