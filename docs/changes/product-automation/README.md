# Product automation branch change guide

Branch: feature/product-automation. Base: current main in ThaiBaoNguyen06/SWE40006-MiniShop-Project after original ZIP import (PR #1).

## Problem and resulting behaviour

The baseline catalogue had no way to submit a product through the website or evaluate a product-data change before publication. This branch adds a Development-only authenticated proposal form and versioned catalogue. Submitting a product does not directly modify the Production database.

Local mode queues the request, builds/tests a candidate, verifies Staging and waits for explicit local approval before Production. GitHub mode commits the proposal on feature/catalogue-<id>; the workflow verifies/builds it, deploys/tests Staging on a trusted runner and opens a PR only after staging passes. Production runs after owner review/merge, not automatically when the form is submitted.

## Affected components

- backend/src/catalogue.ts and backend/catalogue/products.json: validation, stable keys and transactional publication of versioned data.
- backend/src/automation.ts and proposals.ts: protected proposal API, local queue and GitHub adapter; GitHub token remains server-side.
- frontend/src/ProductProposalForm.tsx: form and progress/review UI.
- scripts/pipeline.mjs, environment.mjs, deploy.mjs: checks, artifacts, fresh Testing projects per release, Staging-only option and release verification.
- scripts/automation-worker.mjs and start-automation.mjs: local orchestration and approval handling.
- .github/workflows/ci.yml: hosted verification, candidate Staging, PR creation and post-merge Production deployment.
- deploy/, monitoring/, tests and docs: reproducible environments, actual monitoring, automated coverage and assessment evidence.

## Setup

Read the root README and docs/PRODUCT_AUTOMATION.md. The four local target ports are 8281–8284; monitoring uses 9190. Testing projects include a release hash to keep independent data and preserve old test volumes. Only prior minishop-final-testing containers are stopped to free the testing port; volumes are not deleted. No catalogue-row deletion was introduced.

Local mode runs without GitHub credentials. A locally generated admin code is stored in ignored .local/automation/admin-token. Do not commit it. Real GitHub mode requires a scoped server-side App/PAT token, workflow PR permissions and a trusted Windows runner with persistent deployment state.

## Validation

Backend unit/API/adapter suite and frontend lint/build passed. Six Playwright cases passed on the initial full pipeline and on the real product candidate in Testing and Staging. A real form submission produced nine products in Staging while Production remained at eight, awaiting local approval. These are local results, not proof of online GitHub automation. The final branch verification and CI status are recorded in docs/FOUR_LEVEL_AUDIT.md and docs/VERIFICATION.md.

## Limitations

No automatic merge, public hosting, full account/role management, distributed queue, backup/restore or automatic rollback is claimed. Local approval is not a GitHub PR. Unmanaged database rows are preserved. Approving a candidate publishes versioned catalogue values, so this is not a concurrent checkout/inventory application. GitHub adapter tests use mocks; actual remote behaviour must be verified after configuring and integrating the branch.
