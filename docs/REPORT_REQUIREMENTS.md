# Final report requirements mapped from supplied Canvas screenshots

## Assessment structure

The supplied brief states 12% of the final mark and a team submission. The rubric totals 12 points: technical documentation/structure (2), project definition/background/architecture (2), toolchain evolution/change documentation (2), level-by-level implementation/evidence (4), and troubleshooting/operational/team reflection (2).

There is no strict word count. The report must use full sentences and a professional, unified group voice; raw bullet lists or unexplained console dumps are not a finished report.

## Required chapter order

1. Cover page: project title, group name and every team member.
2. Table of contents.
3. Project Definition and Background: catalogue application, original delivery problem, goals and target architecture.
4. Pipeline Design and Toolchain Evolution: high-resolution architecture diagram with Code Repository, CI/Build, Test/Staging and Production roles; changes since the original Project Brief with technical justification.
5. Level-by-Level Implementation and Evidence: Levels 1–4, with step-by-step configuration, commands, results and interpretation.
6. Troubleshooting and Problem Resolution: errors, debugging actions, outcomes and unresolved issues.
7. Project Outcomes and Reflections: achieved/unachieved objectives, pipeline evaluation and lessons.
8. Link to the project repository.
9. Appendices: captioned figures, formatted logs and evidence register as appropriate.

Each technical step needs both a high-resolution captioned screenshot and relevant formatted terminal/build output. Explain what the evidence establishes and its limits. Source code and configuration files must be supplied separately through the project repository.

## Contribution submission

The official Project Report Contribution Document must be completed and signed by all actual group members and submitted alongside the report, using the official template. Individual author names must not be attached to report sections; contributions belong in the separate contribution document. Do not fabricate signatures, contributions, group details or dates.

## Evidence rules by level

- Level 1: setup and connection evidence for repository, CI/build, test/staging and production roles. A local ZIP and YAML alone are not a hosted repository or runner execution.
- Level 2: real monitoring of the Production target with visual CPU/RAM/latency metrics, not static demonstration data.
- Level 3: application breakdown, actual unit/integration/E2E execution on Testing before deployment, and live Production accessibility/database/behaviour verification.
- Level 4: a real automatic source push trigger progresses through build, tests and Production deployment. Local manual invocation must be labelled separately.

## Current assessment risks

The rebuild is intentionally local/no-cloud at the user's request. Confirm the assessor accepts isolated container instances sharing one machine. Hosted CI/CD evidence remains dependent on an accessible agreed GitHub repository and registered runner. Neither local environment names nor screenshots of code prove that online deployment occurred.

The original Project Brief has not been supplied in full here. Change documentation can compare against the provided ZIP and presentation feedback now, but comparison against the original Brief must be verified from that document before submission.
