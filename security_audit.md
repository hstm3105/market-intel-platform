# Application Security Audit

**Scope:** Public-repository source review, authentication and authorization boundaries, executive delivery, input and request controls, dependency audit, and production-facing server configuration.  
**Assessment date:** 21 August 2026.  
**Status:** Remediations applied and covered by regression tests; one constrained upstream dependency advisory remains.

## Remediated Findings

| Area | Finding | Remediation | Validation |
|---|---|---|---|
| Request exhaustion | The API accepted 50 MB JSON and form bodies despite using structured research inputs. | Reduced JSON and URL-encoded request limits to 1 MB. | `securityConfig.test.ts` |
| Framework disclosure and baseline headers | Express exposed its framework header and did not set a standard security-header baseline. | Disabled `X-Powered-By` and added Helmet with compatibility-safe CSP handling. | `securityConfig.test.ts` |
| API abuse | The tRPC API lacked an explicit server-side rate limit. | Added a 300-request / 15-minute rate limit with modern standard headers. | `securityConfig.test.ts` |
| Session CSRF posture | Session cookies used `SameSite=None` unnecessarily. | Changed sessions to HTTP-only, proxy-aware, `SameSite=Lax` cookies. | `cookies.test.ts` |
| Gmail header injection | A hostile briefing title could introduce newline characters in a generated mail header. | Normalized dynamic sender, recipient, and subject header values and added a hostile-title test. | `googleWorkspaceDelivery.test.ts` |
| Dependency exposure | Initial production audit reported 83 findings, including 1 critical. | Upgraded tRPC, Drizzle, Axios, NanoID, Streamdown, Express, AWS SDK modules, and Recharts to maintained patched releases. | `pnpm audit --prod` |
| Public-source hygiene | OAuth values were supplied as protected secrets but the source repository is public. | Checked current tracked files and reachable Git history for refresh-token and OAuth-secret patterns; none were found. | Git source/history scan |

## Controlled Residual Exposure

The post-remediation production audit reports **two high-severity findings** through `pptxgenjs@4.0.1` and its transitive `image-size@1.2.1`. The package has no newer published release or patched `image-size` version available at the time of assessment. The application’s PowerPoint export path only builds text and shapes; it does not invoke `addImage`, image sizing, or remote image fetches. This removes the user-controlled image-byte path that would make the advisory reachable. The boundary is regression-tested in `reportExport.security.test.ts` and should be reassessed when PptxGenJS publishes an updated dependency graph.

## Ongoing Operating Controls

All executive delivery is organization-scoped, approval-gated, immutable in its delivery ledger, and audited. Google OAuth material remains server-side in protected project secrets. The external delivery interface validates recipient email syntax, retains source appendices, and requires explicit user confirmation before an email send is initiated.
