# Feedback response and final-report work plan

Source reviewed: supplied SWE40006-Project-main.zip; not a verified current GitHub main snapshot. Date: 28 October 2026, Australia/Sydney.

| Feedback | Response in this rebuild | Evidence still needed |
|---|---|---|
| Presentation needs preparation | Provide architecture, exact commands, responsibilities and limitations; rehearse from observed outputs | Team rehearsal and speaker ownership |
| Problem statement needs project specifics | docs/DESIGN.md defines the product catalogue, original manual setup problem and measurable delivery objectives | Team review of scope and claims |
| No tool alternatives or testing/monitoring discussion | Design includes alternatives and tradeoffs; tests and custom monitoring added | Actual test and monitoring outputs |
| No Staging/Production consideration | Four isolated environment configurations, separate volumes and explicit promotion checks | Logs/UI showing real use of each role; assessor acceptance of one-host isolation |
| Demo only local deployment | Local reconstruction is explicitly labelled local, not claimed as remote CD | Agreed GitHub repository, hosted CI, runner, and GitHub-triggered deployment |

## Implementation priorities

- Foundation: preserve the ZIP's app, fix reproducible database initialization, separate four environment instances.
- Verification: unit/API checks, real-database/browser acceptance checks, frontend empty/error behaviour, pipeline failure gate.
- Monitoring: run custom collection against the new Production target and capture live resource/latency evidence.
- Promotion: build versioned images once, evaluate Testing, then verify Staging and Production.
- Reproducibility: validate clean install, repeated seed and deployment, record exact release and test results.
- Recovery: retain old image, demonstrate application rollback; implement/test database backup/restore separately.
- GitHub: reconnect to the agreed repository, create PR, verify hosted checks, establish trusted runner, then demonstrate GitHub-triggered promotion. Owner review/merge required.
- Report: record each requirement, configuration, command, actual output, screenshot caption, failure/fix, limitation and individual contribution.

## Four-level completion rules

Level 1: establish and document repository/CI infrastructure and four environment roles; local containers are not automatically evidence of separate remote servers.

Level 2: verify Production monitoring and Level 1; custom scripts are allowed, so migrating to Grafana is optional.

Level 3: execute unit/integration/E2E verification before deployment and verify the actual Production target; local pipeline evidence and GitHub execution evidence must be separated.

Level 4: record a visible source change progressing from GitHub event through CI, artifacts, staging and final deployment. A manually invoked local script alone does not complete that demonstration.

## Recommended report structure

1. Project problem, scope and measurable objectives.
2. Tool-selection matrix and technical justification.
3. Application, environment and delivery architecture.
4. Implementation organised by Levels 1–4.
5. Test strategy, fixtures, actual results and failure-gate demonstration.
6. Monitoring measurements and interpretation.
7. Release traceability, deployment verification and recovery.
8. Troubleshooting, limitations, lessons and team contributions.
9. Evidence appendix with captions and raw logs.
