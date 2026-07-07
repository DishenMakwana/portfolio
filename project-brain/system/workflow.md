# Engineering Lifecycle - workflow.md

## Purpose
Defines the execution pipeline of the Project Brain.

```
Receive Prompt
   │
   ▼
Retrieve Context (Graph & Cache lookup)
   │
   ▼
Planning (Produces implementation_plan.md)
   │
   ▼
Execution (Modifies files, respects standards)
   │
   ▼
Static Validation (npm run lint, npm run build)
   │
   ▼
AI Review & Confidence Scoring (Target overall score >= 90)
   │
   ▼
Knowledge Synchronization (Incremental updates to memory files)
```

No implementation logic should reside in this lifecycle file.
