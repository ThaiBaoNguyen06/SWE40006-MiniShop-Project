# Toolchain evolution and change register

| Component | Supplied ZIP baseline | Rebuild | Rationale | Verification |
|---|---|---|---|---|
| Application scope | Read-only product catalogue | Preserved | Focus on DevOps rather than unrelated commerce features | Browser catalogue test pending Docker recovery |
| Express entry point | Routes/listener together | Export app separately from listener | Test HTTP routes without production listener side effects | Backend unit/API suite passed |
| Database setup | Manual schema/data instructions | Versioned first-volume init SQL | Fresh-environment reproducibility | Pending new-volume execution |
| Environment separation | One local Compose stack | Four minishop-final-* projects, ports 8281–8284 | Separate runtime data and target roles | Pending Docker engine recovery |
| Testing | No test framework in ZIP package | Vitest/Supertest and Playwright | Repeatable unit, API, integration and acceptance verification | Backend passed; browser runtime pending |
| Browser setup | No automation | Pipeline installs matching Chromium | Avoid missing-browser repeat-run failure observed earlier | Installation step completed using existing cache |
| Release verification | No reported release identifier | APP_RELEASE in health response | Trace deployed application to image tag | Build passed; live checks pending |
| Production product checks | Not automated | Validate contract without demanding exactly eight production products | Legitimate catalogue additions must not fail deployment | Live check pending; Testing retains eight-product fixture |
| Monitoring | None | Custom Node collector and dashboard | Observe actual target metrics without cloud provisioning | Pending engine recovery |
| Pipeline | None in ZIP | Local pipeline plus GitHub workflow definition | Repeatable checks, image artifact and promotion gates | Unit/build passed; container/online checks pending |
| Dependency | body-parser advisory reported by npm audit | Updated compatible transitive dependency | Address observed high-severity advisory | npm audit reported zero after update |
| Documentation | Setup README, some stale statements | Active setup guide, design alternatives, rubric and evidence mapping | Address reviewer feedback and avoid overclaiming | Source/document inspection |

This table compares against the supplied ZIP. It must not be described as a verified comparison with the original Project Brief until that Brief has been read.
