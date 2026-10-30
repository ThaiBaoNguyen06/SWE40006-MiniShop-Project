# Design and tool-selection rationale

## Project-specific problem

MiniShop is a read-only technology product catalogue backed by PostgreSQL. Its original ZIP required local Docker setup, manually initialized database data, and human verification. That process makes a clean setup, team handover, repeatable testing and traceable releases difficult. The delivery objective is to make the existing catalogue reproducible across isolated environments and collect evidence that failed checks block promotion. This work does not implement shopping carts, payments or account management.

## Objectives and measurable acceptance

1. A fresh database volume initializes from versioned SQL without manual product insertion.
2. Development, Testing, Staging and Production use independent database volumes and networks.
3. Unit/API/build/lint failures stop pipeline progression.
4. A real browser sees products obtained through Nginx, Express and PostgreSQL in Testing before promotion.
5. Every deployed backend reports the expected release identity.
6. Production container metrics and database-health latency are observable.
7. GitHub-triggered execution and deployment will be proven separately after repository/runner access exists.

## Application architecture

Browser → Nginx/React → Express/Node.js → PostgreSQL.

Nginx serves the compiled React application and proxies `/api/` to Express. PostgreSQL is internal to each Compose network and persists in its environment-specific volume. Only the frontend publishes a loopback port in the new deployment file. This is local target hosting.

## Delivery architecture

Local: pipeline.mjs → unit/API checks → application builds/lint → Docker images/archive → Testing → browser checks → Development → Staging → Production health/release checks.

GitHub design: feature/PR → hosted verify → versioned Actions artifact. Main push after successful verification → trusted Windows runner → download same-run artifact → docker load → Staging checks → Production checks. Merely declaring this workflow does not prove online CD.

## Alternatives and selection

This is the team's project-specific evaluation, not a benchmark of all available products.

| Area | Chosen approach | Alternatives considered | Reason and tradeoff |
|---|---|---|---|
| Repository | Git/GitHub when reconnected | GitLab, Bitbucket | Fits existing collaboration; access to the agreed remote is currently unresolved |
| CI | GitHub Actions | Jenkins, GitLab CI | Keeps workflow with code and avoids running another CI service; hosted usage and repository permissions still matter |
| Packaging | Docker/Compose | Manual Node installs, separate VMs | Reuses existing Dockerfiles, networks and volumes; all local environments still share one host/engine |
| Unit/API tests | Vitest + Supertest | Jest + Supertest, manual requests | Exercises TypeScript logic and Express HTTP responses repeatably; mocked-pool API tests do not establish real SQL compatibility |
| Browser tests | Playwright/Chromium | Cypress, manual browser checks | Verifies user-visible catalogue through the actual stack; browser binaries must be installed consistently |
| Monitoring | Custom Node script/dashboard | Prometheus/Grafana, CloudWatch, Azure Monitor | Allowed by brief and reuses Docker stats without a cloud account; limited retention, alerting and per-request instrumentation |
| Release storage | Actions artifacts | Container registry such as ECR or GHCR | Supports tested-image transfer without setting up registry publishing; retention configured to seven days, not a long-term release archive |
| Hosting | Local isolated Compose projects for this phase | School VM, EC2 | User chose local/no cloud provisioning; no public availability, host redundancy or independent server failure domains |

## Evidence interpretation

A green local pipeline proves only the commands that executed locally. Four project names alone are not proof of four machines. Test counts should be reported by test type, not presented as code-coverage percentages. Live metrics do not prove load capacity. A successful /api/db-health request does not prove every business function works.

## References

- Docker project isolation: https://docs.docker.com/compose/how-tos/project-name/
- GitHub workflow/runner concepts: https://docs.github.com/en/actions/get-started/understand-github-actions
