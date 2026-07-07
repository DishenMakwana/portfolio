# Next.js App Router Standards - nextjs.md

## Server vs. Client Components
*   Keep page routing handlers as Server Components (`export const dynamic = "force-dynamic"`).
*   Delegate user-interactive layout portions (charts, tabs, dynamic filtering) to Client Components using `"use server"` actions for mutations or data requests.
*   Enforce proper `revalidatePath` on actions to trigger cache invalidation and page data refreshes.
