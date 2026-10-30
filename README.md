# MiniShop — final-report rebuild

This source starts from the supplied `SWE40006-Project-main.zip`, preserves its product-catalogue application, and adds an independently verifiable local delivery pipeline. This checkout is on `feature/product-automation` and is connected to the new repository https://github.com/ThaiBaoNguyen06/SWE40006-MiniShop-Project. The original ZIP has been pushed separately on feature/zip-baseline; this enhanced implementation is being reviewed separately on feature/product-automation.

## Requirements

Node.js 24, npm and Docker Desktop running Linux containers. Keep ports 8281–8284 and 9190 available. No AWS account is needed.

## Start the complete local pipeline

From this folder:

```powershell
node scripts/pipeline.mjs final-baseline
```

The pipeline installs dependencies, prepares Chromium, executes backend unit/API tests, builds/lints the applications, builds and saves Docker images, deploys Testing, executes browser checks, and only then deploys Development, Staging and Production. Windows browser binaries are prepared automatically in ignored `.local/playwright-browsers` unless PLAYWRIGHT_BROWSERS_PATH is set. Use a fresh release name after each source change.

| Environment | URL | Compose project |
|---|---|---|
| Development | http://127.0.0.1:8281 | minishop-final-development |
| Testing | http://127.0.0.1:8282 | minishop-final-testing |
| Staging | http://127.0.0.1:8283 | minishop-final-staging |
| Production target | http://127.0.0.1:8284 | minishop-final-production |

These are separate container/network/database/volume instances on one host. They are not public hosting or separate physical servers. Confirm the environment interpretation with the assessor. The original local project and ports 8080/8181–8184 are separate.

## Monitoring

In a separate terminal:

```powershell
node scripts/monitor.mjs
```

Open http://127.0.0.1:9190. The custom script collects Production container CPU, RAM and cumulative network/block I/O, and probes the database-health HTTP endpoint. It keeps recent latency samples and JSONL history. These are Docker Desktop Linux-container metrics; the dashboard does not measure all Windows host usage or all application requests. Stop the foreground script with Ctrl+C after use. Metrics logs currently need manual rotation for extended use.

## Tests

```powershell
npm ci --prefix backend
npm test --prefix backend
npm run build --prefix backend
```

Backend: eight unit cases for database URL validation and seven HTTP API cases with a mocked pool. Browser suite: real PostgreSQL catalogue rendering, database/release health, plus browser-only simulated empty/error API responses. The latter two do not verify real database failures.

For standalone browser tests, install testing dependencies and browsers, then use BASE_URL and EXPECTED_RELEASE for the chosen deployment. When using a custom PLAYWRIGHT_BROWSERS_PATH, set it consistently during both installation and tests. `pipeline.mjs` handles this automatically.

## Deployment and recovery

`node scripts/deploy.mjs staging RELEASE` or `node scripts/deploy.mjs production RELEASE` deploys existing images and checks health, live database, catalogue shape, and release identity. Only Testing requires the fixed eight-product fixture. Other environments allow a valid catalogue with a different product count.

To roll back an application, deploy a retained previous image release. The database volume is preserved; this is not a database rollback. There are no schema migrations in this version. Production backup/restore remains a separate item to implement and verify before claiming recovery capability.

## GitHub integration

The workflow under `.github/workflows/ci.yml` runs hosted verification for main/feature pushes and pull requests targeting main. It archives tested images and browser reports. Main push events can additionally deploy Staging/Production on a configured Windows self-hosted runner labelled `minishop-deploy`.

This checkout is connected to the new GitHub repository. The original ZIP baseline was integrated into main through PR #1. The enhanced feature remains separate until reviewed. No hosted candidate-to-Production run or runner registration has been verified for this feature. On the runner set MINISHOP_STATE_DIR to the stable directory containing these environments' existing generated passwords. Do not run the self-hosted deployment job for untrusted pull requests.

See docs/REPORT_PLAN.md, docs/DESIGN.md and docs/EVIDENCE.md for final-report planning. docs/ORIGINAL_README.md is the archived original ZIP documentation; it is not the active setup guide.

## Add a product through the website

The Development site includes an authenticated product proposal form. In local mode a worker automatically tests and deploys proposals to Staging, then waits for explicit local approval before Production. This is clearly labelled a local demo. GitHub mode creates a versioned catalogue commit, runs Actions/Staging and opens a real PR after successful staging, but requires server-side GitHub credentials and a registered runner. See [complete setup and limitations](docs/PRODUCT_AUTOMATION.md).

## Assessment status

Read [the four-level audit](docs/FOUR_LEVEL_AUDIT.md) for verified evidence versus outstanding requirements, and [the branch change guide](docs/changes/product-automation/README.md) for this feature. Do not report all four levels as complete until the GitHub-triggered deployment has actually run.
