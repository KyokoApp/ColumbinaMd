<!-- CONTRIBUTING.md explains every item below. Tick what is done, and say plainly if something is not. -->

## What this changes

<!-- One or two sentences. What is different after this merges, and why. -->

## Version

<!-- The number this takes, and the issue that assigned it. -->

## Checklist

- [ ] Rebased on the latest `main`
- [ ] The version is raised in every file that carries it, `cli/package-lock.json` included
- [ ] `node scripts/check-repo.mjs` passes
- [ ] `npm test` in `cli/` passes, and it was run on the operating system I actually use
- [ ] `node cli/scripts/sync-skills.mjs` was run, if `antislop.md` changed
- [ ] `node scripts/skill-index.mjs` was run, if a skill gained or renamed a named pattern
- [ ] `README.md`, `GUIDE.md`, and `ROADMAP.md` are updated together, if this changes what ships
- [ ] Every command names `miqdadbadjuber/anti-slop`, not a fork
- [ ] No em dashes or en dashes (R-02)
- [ ] Comments are one or two lines

## If this opens a new agent door

<!-- Delete this section if it does not. -->

- Vendor documentation for the skill path or the plugin format:
- Checked against a real install, or documentation only:
- Does this agent read a folder another agent's install already writes, and if so which:
