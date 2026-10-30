# Security update — v1.0.1

- Next.js: 15.5.4 -> 15.5.28 (latest 15.5 backport at time of fix; covers CVE-2025-66478 / React2Shell and the December 2025 follow-ups CVE-2025-55183, CVE-2025-55184, CVE-2025-67779, for which 15.5.9 was the December patched release — 15.5.28 supersedes it)
- React / React DOM: 19.1.1 -> 19.2.3 (patched React Server Components packages)
- eslint-config-next: 15.5.4 -> 15.5.28 to match Next.js
- Note: 15.5.7 alone was NOT sufficient — npm flagged it as still vulnerable, which is why this fix goes to 15.5.28, not 15.5.7.
- Vercel note from the deploy that triggered this fix: the previous build itself succeeded, but Vercel cleared the build cache after a dependency security block and asked for a redeploy with a clean cache. After this push, redeploy from the new main commit.
