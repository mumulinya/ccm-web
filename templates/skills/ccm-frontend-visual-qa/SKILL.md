---
name: ccm-frontend-visual-qa
description: Verify user-visible frontend work in a real browser. Use for pages, dialogs, chat surfaces, forms, dashboards, responsive layouts, visual regressions, or interaction changes requiring semantic actions, observable assertions, screenshots, console and network checks, and desktop/mobile coverage.
---

# CCM Frontend Visual QA

## Workflow

1. Start or identify the real application and navigate to the actual feature state.
2. Exercise the primary user flow with semantic locators and assert observable state after every meaningful action.
3. Cover loading, success, empty, error, disabled, overflow, and long-content states that matter to the change.
4. Verify representative desktop and mobile viewports without overlapping, clipped, or unreadable content.
5. Inspect console and relevant failed network requests.
6. Capture screenshots that show the criterion and state being proved; reject blank or unrelated images.
7. Record criterion-linked results and reproducible failure steps.

Read [references/visual-checklist.md](references/visual-checklist.md) for detailed state and screenshot coverage.

A successful click call or page load is not evidence that the UI works.
