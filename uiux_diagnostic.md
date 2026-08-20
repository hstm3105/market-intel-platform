# Application-wide UI/UX Diagnostic

## Initial desktop inventory — 20 August 2026

The dashboard, research creation, tracked industries, monitoring, source intelligence, knowledge, portfolio, executive briefings, client delivery, workspace, scan detail, risk comparison, organization, governance, collaboration, evidence agents, and mobile companion routes are in the scope of this review. Representative desktop states were captured for every application route, including a populated scan-detail view.

### High-priority shared findings

| Area | Finding | User impact | Priority |
|---|---|---|---|
| Sidebar navigation | The four navigation groups make the sidebar vertically dense. At a 900-pixel desktop height, the administration group can collide visually with the user footer. | Lower-priority destinations are easy to miss and the primary workspace loses breathing room. | High |
| Header | The persistent header repeats a generic desk label and always exposes the same action without giving contextual orientation or responsive reduction. | It consumes vertical space across every route without materially improving wayfinding. | High |
| Page introductions | Most workspaces use a large, multi-line editorial hero regardless of task complexity. | Actionable controls are pushed below the fold, especially on governance, evidence agents, delivery, and research-detail flows. | High |
| Card density | Several pages use individually padded cards for related controls, producing excess vertical rhythm and duplicated labels. | Consultants scan fewer records per viewport and must scroll to complete routine work. | High |
| Empty and pre-action states | Evidence agents, risk comparison, collaboration, and delivery use large informative empty panels. | Helpful guidance becomes visually dominant after a user understands the workflow. | Medium |
| Feedback and state hierarchy | Status badges are generally clear, but actionable vs. reference information competes in several workspace headers. | Users must parse more labels before identifying the next step. | Medium |

### Route-level observations

| Route family | What works | Improvement direction |
|---|---|---|
| Research and workspace | Strong source-grounded language, relevant search and filters, clear scan rows. | Make headers compact; keep filters and the first 5–8 relevant records above the fold; use line clamps consistently. |
| Detail and intelligence | Evidence score, source context, and export actions are visually premium. | Compress headline bands and move low-frequency exports into a small action group. |
| Comparison and agents | Guided multi-step inputs explain complex workflows well. | Reduce instructional panels after selection begins; present selection counts and next action in a sticky compact action bar. |
| Portfolio, delivery, and executive briefings | Enterprise controls are well structured and use consistent authority cues. | Favor a compact operational toolbar over decorative header height and collapse passive registries or ledgers by default. |
| Organization, governance, and collaboration | Permissions and audit concepts are clear and appropriately restrained. | Reduce hero height; keep important control/posture summaries immediately adjacent to the editable controls. |
| Mobile companion | The route is intentionally independent and task-focused. | Confirm that mobile prioritizes triage and action rather than reflowing desktop dashboards. |

## Responsive inventory — 390 × 844

The full route inventory was also captured at a phone viewport. Layouts do not visibly overflow horizontally, and the persistent compact header preserves a reliable primary research action. However, the screenshots confirm that hero treatment is consistently too tall for task-oriented mobile pages: client delivery, source intelligence, risk comparison, organization, governance, collaboration, and evidence agents use half to nearly all of the opening viewport before the first actionable control appears.

| Responsive pattern | Observation | Remediation standard |
|---|---|---|
| Mobile hero panels | Multi-line 36–48 pixel display type, generous padding, and long explanatory copy dominate the first screen on operational routes. | Reserve editorial hero treatment for Home and major research-detail pages; use compact title/action headers for controls and registries. |
| First actionable control | The first filter, selector, retention input, integration switch, or scan checkbox commonly starts only after one full viewport. | Place the primary selector or action directly below a compact 2–3 line header, targeting the first 60% of the viewport. |
| Card nesting | Deeply rounded parent card plus individually rounded child cards creates tall stacks on mobile. | Flatten related controls into bordered sections inside a single panel and use accordions or disclosure for passive detail. |
| Static instructions | Several routes repeat workflow explanation on every revisit. | Keep one sentence of contextual framing visible; place long method explanation in a disclosure labelled “How this works.” |
| Sidebar/header context | Mobile header is appropriately reduced, but its fixed descriptive label takes more space than necessary across every route. | Replace generic context text with a short route-aware cue or omit it on compact control pages. |

## Remediation standard

The cross-application pass will preserve the established consultant-intelligence visual identity while applying the following experience standard to every routed workspace:

1. **One primary decision per opening view.** The current status, the next action, and the key context must appear before passive ledger detail.
2. **Compact operational headers.** Editorial treatment remains appropriate for the dashboard and report-like research details. Operational routes use a tighter header, a maximum three-line contextual description on mobile, and visible actions or selectors immediately below.
3. **Progressive disclosure for reference material.** Long explanations, reference ledgers, and passive registries are collapsed or de-emphasized until the primary control has been encountered.
4. **Responsive density without horizontal compromise.** Related control cards become one structured panel on mobile; count tiles and passive badges are secondary to editable controls.
5. **Shared wayfinding and interaction feedback.** The sidebar remains scroll-safe at constrained desktop heights, the header supplies a route-aware context label, every icon-only control has an accessible name, and keyboard focus remains visible.

## Applied remediation

The shared application shell now uses a **scroll-safe navigation region**, smaller menu controls, and automatic hiding of the explanatory sidebar card at constrained desktop heights. This prevents the administration destinations from competing with the account footer. The top bar was reduced to a compact route-aware label and retains one clear global action: a new scan.

Every dashboard-routed workspace now renders inside the `app-workspace` density system. The system compresses opening editorial headers, shortens mobile context copy to two visible lines, reduces route-to-route vertical spacing on phones, and harmonizes card radii without removing meaningful content. It preserves the more report-like scan-detail page while improving operational workspaces.

The risk comparison and evidence-agent flows received additional workflow-specific improvements. Their longer method explanations now live behind accessible disclosure controls, while the visible opening copy states the decision purpose. Evidence-agent scan summaries have deterministic two-line clipping so the user can compare choices without lengthy card stacks. Static UI tests now assert the scroll-safe sidebar, route-aware header, compact mobile system, and key progressive-disclosure pattern.
