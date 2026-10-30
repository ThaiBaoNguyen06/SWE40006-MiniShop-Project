# Branch change guide

Branch: feature/automated-testing. Baseline: supplied ZIP. No remote connection/push/merge for this rebuild.

Implemented: reusable backend unit/API tests and app export, database configuration validation, dependency patch, Playwright catalogue/database tests plus simulated empty/error UI tests, automatic browser preparation, four isolated local deployments, first-volume schema/seed, live custom monitoring, CI/deploy workflow configuration and assessment-focused documentation.

Configuration and usage: see root README. Environments use ports 8281–8284 and minishop-final-* project names; monitoring uses 9190. Secrets and state are generated under ignored .local/. Existing project remains separate.

Validation and remaining work: see docs/VERIFICATION.md and docs/REPORT_PLAN.md. CI YAML is configured but no hosted run or self-hosted deployment has been verified for this checkout. Cloud hosting and real GitHub-triggered CD remain pending rather than claimed complete.
