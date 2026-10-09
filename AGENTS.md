<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->
- Training: exercises in `exercise_library` are shared across workouts; `exercises` rows hold per-workout prescription and are archived (never deleted) so set history survives. History is keyed by `library_id` and only counts `done` sets of sessions with `finished_at` — keeps one exercise's history across workouts and ignores in-progress sessions.
