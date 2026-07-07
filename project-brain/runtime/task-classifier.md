# Task Classifier Specification - task-classifier.md

## Purpose
Classifies incoming prompts by discipline area (frontend, backend, database, configuration) to trigger target subset loading.

## Classification Rubric
*   **Database Schema/Migration changes**: Classifies as Database. Triggers `database.md` context loading.
*   **Component styling, charts, UI tabs**: Classifies as Frontend. Triggers `frontend.md` context loading.
*   **Actions, calculations, algorithms, routing**: Classifies as Backend. Triggers `backend.md` context loading.
