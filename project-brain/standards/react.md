# React Standards - react.md

## Modularity & Responsibilities
*   **Component Splitting**: Keep components focused. Break large layouts (like dashboard tabs) into separate sub-components.
*   **Hooks Usage**: Use standard React hooks for component state. Avoid raw side effects outside `useEffect` or React transaction triggers.
*   **Aesthetic Alignment**: Ensure components match the slate-950/emerald premium design system.
*   **Data Props**: Keep interface structures immutable. Pass clean objects with explicit types.
