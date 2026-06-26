# Skill authoring reference

A deeper reference for writing skills in this repo. The `hello-greencar` skill
points Claude here when the user wants more than the basics.

## Anatomy of a skill

```
skills/
└── my-skill/
    ├── SKILL.md        # required — frontmatter + instructions
    ├── reference.md    # optional — extra docs Claude reads on demand
    └── scripts/        # optional — helper scripts the skill can run
```

### SKILL.md frontmatter

```markdown
---
name: my-skill
description: When to use this skill. Be specific about the trigger so Claude
  can decide whether to invoke it automatically.
---
```

| Field          | Required | Notes                                                    |
| -------------- | -------- | -------------------------------------------------------- |
| `description`  | yes      | The trigger. Drives automatic invocation. Be concrete.   |
| `name`         | no\*     | Defaults to the folder name; keep them matching anyway.  |

\* Optional in practice, but include it and keep it equal to the folder name to
avoid surprises.

### Body

Everything after the frontmatter is the instruction set Claude follows when the
skill runs. Write it as direct instructions ("When invoked, do X, then Y"),
not as marketing copy.

## Good description writing

The `description` is read by Claude to decide *whether* to use the skill. Two
rules:

1. **Describe the trigger, not just the capability.** "Use when the user wants
   to generate a release changelog from merged PRs" beats "Generates
   changelogs."
2. **Front-load distinctive keywords.** If the skill is about Figma exports,
   say "Figma" early.

## Supporting files

Reference extra files from the body by relative path and tell Claude when to
read them, e.g. "If the user asks about X, read `reference.md`." This keeps the
main `SKILL.md` short while allowing depth on demand.

## Where skills can be installed

- **User scope:** `~/.claude/skills/<name>/` — available in every project.
- **Project scope:** `<repo>/.claude/skills/<name>/` — shared with collaborators
  via the repo.
- **Plugin scope:** bundled inside a plugin's `skills/` folder and installed via
  `/plugin`. This repo supports that too (see the repo README).
