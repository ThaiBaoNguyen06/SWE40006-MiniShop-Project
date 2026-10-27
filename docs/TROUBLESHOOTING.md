# Troubleshooting log

## T01 — Missing implementation in ZIP compared with earlier working branch

Observation: the supplied ZIP includes application code, Dockerfiles and a single Compose stack, but no CI YAML, automated-test suite or monitoring implementation. Action: retain the ZIP as the source baseline and bring reusable testing/pipeline components into a separate checkout. Interpretation: ZIP state does not establish the current state of a private/inaccessible remote repository.

## T02 — GitHub repository not readable

Observation: connector and public API returned 404 for the supplied repository URL. Action: no credential extraction or remote mutation; user selected ZIP-based reconstruction. Status: hosted CI/PR/CD proof remains pending an accessible agreed repository.

## T03 — Dependency security advisory

Observation: npm audit reported a high-severity advisory in transitive body-parser versions below 2.4.0. Action: update that compatible transitive dependency and retain the resulting lockfile. Result: subsequent npm install/audit reported zero vulnerabilities. Limitation: this is a point-in-time package audit, not a full security assessment.

## T04 — Docker Desktop startup crash

Observation: Docker Desktop reported it could not rename sailor-ingest.sock to sailor-ingest.sock.stale; Docker engine pipe was absent. Actions: read local Docker logs/processes, try official Desktop lifecycle commands, stop only verified UI/backend processes after graceful stop failed, then attempt clean restart. No reset or data deletion. Status: unresolved until a successful engine check. Impact: browser integration tests, image builds, local deployment and monitoring execution are blocked. Added an early engine preflight to make this dependency failure clear before build work begins.

This operational failure belongs in the report together with its error screenshot, attempted actions, final outcome and any remaining limitation. Do not claim the fix succeeded until Docker engine responds.

## T04 follow-up — Engine available

The user subsequently reported Docker Desktop opening successfully. The engine responded as Linux version 29.7.2, and original containers/databases appeared healthy. Both new local pipeline runs then completed. This demonstrates restored availability, not proof that a specific attempted action permanently fixed the socket issue. No reset or data deletion was used.
