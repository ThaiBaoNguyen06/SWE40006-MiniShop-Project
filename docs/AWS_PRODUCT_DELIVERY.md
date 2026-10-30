# Website product delivery to AWS

The administrator submits a product on the HTTPS Production website. Express validates the product and uses a server-held GitHub credential to append it to a versioned catalogue on a candidate branch. It does not insert the product into the live database at submission time.

The `AWS product delivery` workflow builds and tests that candidate on an Ubuntu runner. The trusted Windows deployment runner transfers the resulting Docker image archive and the candidate source to AWS Staging. Archive SHA256 is checked before loading. Browser acceptance tests run against the public Staging application. Only a successful Staging job permits the Production job to load the same image archive, verify the endpoints/catalogue, and advance `catalogue-live`. No application-code PR is automatically merged.

The workflow serializes deliveries. It rejects candidates whose only parent is no longer the currently published catalogue. This protects products from being lost when two proposals start from the same catalogue; the stale submission must be retried. GitHub may replace an older pending workflow when several are queued; the UI reports a cancelled delivery as failed, never live. The form uses the exact candidate SHA and dedicated workflow to report success.

## One-time owner setup

1. Review this feature branch and its CI result. Create `catalogue-live` at the reviewed feature revision. Candidate branches must inherit this workflow and application version. Keep application-code changes on ordinary review branches.
2. Install the official GitHub Windows runner outside the repository, labelled `minishop-aws-deploy`. Run it under the trusted account that can read the AWS SSH key. It requires Node 24 and OpenSSH; Docker is used by the separate Ubuntu verification job, not by SSH deployment. This computer must remain awake and connected. Never execute fork PRs on the deployment runner.
3. Set `MINISHOP_AWS_CONFIG` in the runner process to a private JSON file with keys `repository`, `stagingHost`, `productionHost`, `keyFile`, and `knownHostsFile`. The repository is `ThaiBaoNguyen06/SWE40006-MiniShop-Project`; current host addresses are `13.218.245.164` and `34.203.248.254`. SSH uses strict known-host validation and the existing /32 firewall rule. Keep these files outside the runner checkout. Restart the runner after changing its process environment.
4. Install a trusted HTTPS certificate and reverse proxy on Production. The Nginx container must publish only its loopback port 8284; the TLS proxy handles public ports 80/443 and supplies the forwarded protocol. Do not expose an admin code over the existing HTTP preview. Do not bypass browser certificate warnings.
5. Create a narrowly scoped GitHub credential for this repository with Contents read/write and Actions read. Store it only in `/opt/minishop/state/automation/github-token`, mode 0600. Do not paste it into a chat, Git file, workflow, browser local storage or report. The application never returns it to the client.
6. On Production, create a private `/opt/minishop/automation-settings.json` with `AUTOMATION_ENABLED=true`, `ALLOW_PRODUCTION_PROPOSALS=true`, `AUTOMATION_MODE=github`, `GITHUB_DELIVERY_MODE=automatic`, `GITHUB_REPOSITORY=ThaiBaoNguyen06/SWE40006-MiniShop-Project`, `GITHUB_BASE_BRANCH=catalogue-live`, and the public `STAGING_URL`/HTTPS `PRODUCTION_URL` (all values are JSON strings). The existing admin-code file stays private and is mounted read-only.
7. Deploy the reviewed feature revision once, then perform one administrator submission. Capture its candidate SHA, workflow run, Staging result, Production result, and both catalogue responses. Do not mark this setup complete until that actual run succeeds.

## Failures and recovery

An invalid product is rejected before GitHub writes. A failed build or Staging test prevents the Production job. A failed Production activation attempts to restore prior application images. PostgreSQL catalogue synchronization uses upserts, so restoring old images does not undo database changes or remove a newly inserted product. Such a partial deployment needs operator inspection; the UI intentionally says publication is unconfirmed after any failed workflow.

The lab IPs and SSH source rule may change after restart/network changes. Update the private runner configuration and reviewed workflow Staging URL when that occurs. Expired lab sessions stop delivery.

## Validation status

The implementation adds protected cloud proposals, exact-run status tracking, a catalogue-only workflow, and checked AWS image transfer. Local backend tests include HTTPS/authentication and failed/cancelled-run cases. Actual GitHub credential provisioning, runner registration, HTTPS setup and the full website-to-GitHub-to-AWS demonstration are separate deployment steps; passing unit/API tests does not prove those connections exist.
