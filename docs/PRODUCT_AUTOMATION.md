# Website product proposals and automatic staging

## User flow

Open the Development website at http://localhost:8281 and select **Add a product**. Enter the local admin access code and product details, then submit. Products are proposals: submitting does not insert directly into Production.

The admin code is generated in `.local/automation/admin-token`. Read it on your own machine with `Get-Content .local/automation/admin-token` and enter it into the form. It is never embedded in frontend source or saved in browser storage. Do not include it in screenshots, logs, chat messages or Git commits.

## Versioned product data

`backend/catalogue/products.json` is the approved catalogue source. Product keys are stable, names are unique ignoring case, prices are validated to two decimal places, and stock is a non-negative integer. On application startup a transaction upserts this versioned catalogue into that environment's PostgreSQL database. Existing fixture rows are associated by name when first migrating to stable catalogue keys. Unmanaged rows are not deleted. This is a read-only shop with controlled catalogue publication, not a live checkout/inventory system.

Automated tests derive the expected catalogue from the candidate file instead of assuming eight forever. A candidate with a ninth product can therefore pass Testing and Staging while Production still has eight before approval.

## Local mode (available without GitHub credentials)

The backend stores the validated proposal in `.local/automation/queue`. A host-side worker starts automatically after the full local pipeline; it can also be started with `node scripts/start-automation.mjs`.

The worker builds a candidate workspace, appends the proposed product, executes the pipeline with `--staging-only`, and runs browser tests on Staging. No Production deployment happens in this phase. The form then displays **Staging passed — awaiting your approval**. Only selecting **Approve production (local demo)** marks the proposal for promotion. The worker deploys the tested image to Production, runs browser verification, updates the local approved catalogue, then refreshes Development.

The worker processes one proposal at a time and waits while a local proposal is awaiting review so another candidate does not overwrite the Staging review target. Job logs and workspaces are under `.local/automation/jobs/<id>/`. If the worker is interrupted, inspect health before resubmitting. The local review is explicitly labelled local; it is not a real Pull Request or proof of a GitHub trigger.

## GitHub mode (configuration still required)

The target repository is https://github.com/ThaiBaoNguyen06/SWE40006-MiniShop-Project. At the time of setup, its main branch initially contained only a README. The original ZIP is uploaded separately on feature/zip-baseline. The automation implementation must be reviewed and merged into main before GitHub mode can read its catalogue and workflow.

1. Set up the agreed repository and register a trusted Windows Actions runner labelled `minishop-deploy`. Keep Docker running and set `MINISHOP_STATE_DIR` in the runner environment to the stable state folder for these deployments.
2. Configure server-side `AUTOMATION_MODE=github`, `GITHUB_REPOSITORY=ThaiBaoNguyen06/SWE40006-MiniShop-Project`, `GITHUB_BASE_BRANCH=main`, and `GITHUB_AUTOMATION_TOKEN` using a repository-scoped GitHub App token or fine-grained personal token. Store the actual secret locally in an ignored file or appropriate secret store, never in this documentation or frontend. The service requires Contents read/write, Actions read and Pull requests read for status tracking.
3. Deploy Development with those environment settings. A Node command can load an ignored configuration file using `node --env-file=.local/automation/github.env scripts/deploy.mjs development RELEASE`. Other environments have proposal editing disabled and do not receive this token.
4. Submitting the website form reads main's approved catalogue, creates feature/catalogue-<id>, and commits the candidate catalogue file. The backend uses fixed GitHub API endpoints and never accepts a user-provided API URL. It does not merge or write directly to main.
5. GitHub push triggers hosted `verify`. After successful verification, `stage_catalogue` loads the saved images onto the Windows runner, deploys Staging and executes browser verification.
6. Only after Staging succeeds, `propose_production` opens a PR into main. Enable the repository option allowing Actions to create pull requests. The job checks that the branch still points to the verified commit. An optional `CATALOGUE_PR_TOKEN` secret can use an App/PAT for PR creation; otherwise the workflow token is used.
7. Owner review/merge is the Production approval. The main push triggers verification again, then re-verifies Staging and deploys Production. No auto-merge is configured.

GitHub does not treat all token-generated events alike. Use an App/PAT for website-generated pushes so the push workflow is triggered. A PR created with GITHUB_TOKEN may require approval for its PR-triggered workflows under GitHub's current rules; do not assume every bot event automatically starts another run. See https://docs.github.com/en/actions/how-tos/write-workflows/choose-when-workflows-run/trigger-a-workflow.

## Tests and limits

The backend suite covers product validation, duplicate rejection, authentication, disabled Production writes, approval ordering, queueing without database mutation, GitHub failure handling and mocked GitHub branch/commit requests. Browser tests cover form submission/status and invalid credentials with mocked proposal APIs, alongside the live catalogue/database tests. A separate local end-to-end drill exercises a real form, real queue/worker and real Staging database. Mocked GitHub calls are not evidence of online automation.

This implementation has a simple local admin code, not a full user/role management system. Keep the editor loopback-only. It has no production-grade distributed queue, automatic retry policy, token rotation or automatic rollback. GitHub access and runner/secret setup must be verified before presenting the remote flow as complete. Changing inventory through the approved catalogue is suitable for this coursework's catalogue app, not concurrent order processing.
