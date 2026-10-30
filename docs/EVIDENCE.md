# Evidence checklist

Capture at the time of execution. Do not regenerate or label old screenshots as evidence of a later release.

| ID | Evidence | Acceptance |
|---|---|---|
| E01 | Source identity and branch | ZIP origin, source hash where useful, working branch, release |
| E02 | Four environment instances | Separate containers/networks/volumes, unique PostgreSQL system identifiers |
| E03 | Fresh database setup | Schema/seed starts from new independent volumes; eight test products |
| E04 | Unit/API checks | Actual runner output and meaningful test descriptions |
| E05 | Lint/build/image packaging | Successful frontend/backend builds, lint and image archive/manifest |
| E06 | Testing acceptance | Real catalogue test plus database/release checks and browser report |
| E07 | UI failure states | Empty/error response simulations clearly identified as browser mocks |
| E08 | Staging and Production | Health/database/products/release responses plus UI screenshots |
| E09 | Production monitoring | Three-container metrics and latency graph with timestamp |
| E10 | Failure gate | Intentionally failing test stops before deployment; Production release unchanged |
| E11 | Visible release change | Before/after screenshots and new release trace; local/online origin labelled |
| E12 | GitHub workflow/PR | PR, commit SHA, green run, artifact and runner/deployment logs; pending until remote connected |
| E13 | Recovery | Previous-image rollback evidence and independent backup/restore drill |
| E14 | Team contributions | Who implemented/reviewed each component and supporting commits |

Keep passwords, tokens, .env values, database dumps and private keys out of screenshots and submitted archives. Application metrics and sanitized test logs can be copied to the report evidence folder.

Generated evidence lives in `.local/evidence/`, browser reports in `testing/playwright-report/`, test attachments in `testing/test-results/`, and packaged images in `artifacts/<release>/`. These are excluded from source control by default. Save selected sanitized evidence deliberately for submission.
