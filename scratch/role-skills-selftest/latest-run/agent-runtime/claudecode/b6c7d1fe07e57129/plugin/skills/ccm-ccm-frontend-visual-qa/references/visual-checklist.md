# Visual QA Checklist

## Layout

- Stable navigation, toolbar, board, table, and composer dimensions
- No incoherent overlap, clipping, horizontal overflow, or text outside controls
- Long labels and multiline content remain readable
- Desktop and mobile feature access remain available

## Interaction

- Focus, enabled and disabled states
- Form validation and error recovery
- Dialog open, close, submit, and cancellation
- Navigation, refresh persistence, and repeated-action safety where relevant

## Evidence

- Screenshot names identify viewport and state
- Assertions describe visible text, URL, count, attribute, or computed state
- Console and network failures are tied to the tested flow
- Failure reproduction includes the minimal action sequence
