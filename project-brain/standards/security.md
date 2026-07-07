# Security Standards - security.md

## Database Injection & Input Sanitization
*   Use Drizzle's parameter binding for all queries. Never construct raw SQL strings dynamically.
*   Enforce constraints on PAN format checks during data injection.
*   Prevent XSS by formatting text values safely when rendering raw data columns.
*   Mask or avoid exposing sensitive details (like full PAN numbers) in general log files.
