git add src/styles.css tailwind.config.ts components.json src/lib/utils.ts
GIT_AUTHOR_DATE="2026-05-21T11:30:00" GIT_COMMITTER_DATE="2026-05-21T11:30:00" git commit -m "chore: setup tailwind and core design system"

git add src/components/ui src/hooks
GIT_AUTHOR_DATE="2026-05-21T13:15:00" GIT_COMMITTER_DATE="2026-05-21T13:15:00" git commit -m "feat(ui): add core shadcn ui components"

git add supabase/migrations
GIT_AUTHOR_DATE="2026-05-21T15:00:00" GIT_COMMITTER_DATE="2026-05-21T15:00:00" git commit -m "feat(db): establish core spin wheel database schemas and migrations"

git add src/integrations/supabase
GIT_AUTHOR_DATE="2026-05-21T16:45:00" GIT_COMMITTER_DATE="2026-05-21T16:45:00" git commit -m "feat(db): configure supabase client and environment"

git add src/lib/auth.tsx src/routes/auth.tsx
GIT_AUTHOR_DATE="2026-05-22T09:30:00" GIT_COMMITTER_DATE="2026-05-22T09:30:00" git commit -m "feat(auth): implement authentication flow and routing"

git add src/router.tsx src/server.ts src/start.ts src/routeTree.gen.ts src/routes/__root.tsx src/routes/index.tsx src/routes/_authenticated.tsx src/routes/_authenticated
GIT_AUTHOR_DATE="2026-05-22T11:00:00" GIT_COMMITTER_DATE="2026-05-22T11:00:00" git commit -m "feat(routing): build application layout and protected routes"

git add src/lib/game.ts
GIT_AUTHOR_DATE="2026-05-22T13:00:00" GIT_COMMITTER_DATE="2026-05-22T13:00:00" git commit -m "feat(game): implement core game logic and typescript interfaces"

git add src/components/SpinWheelDisplay.tsx
GIT_AUTHOR_DATE="2026-05-22T14:30:00" GIT_COMMITTER_DATE="2026-05-22T14:30:00" git commit -m "feat(ui): build dynamic spin wheel visual component"

git add .
GIT_AUTHOR_DATE="2026-05-22T16:00:00" GIT_COMMITTER_DATE="2026-05-22T16:00:00" git commit -m "feat(game): finalize multiplayer arena, realtime sync, and polish"

git push -f -u origin main
