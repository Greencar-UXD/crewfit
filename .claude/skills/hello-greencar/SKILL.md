---
name: hello-greencar
description: Example/template skill for the Greencar-UXD skills repo. Use when someone wants to confirm the skill system is working, or wants a copy-paste starting point for writing a new skill. Greets the user and explains how this skills repo is structured.
---

# hello-greencar

This is the example skill that ships with the `Greencar-UXD/skills` repository.
It exists for two reasons:

1. **A smoke test** — if `/hello-greencar` runs, your skill install worked.
2. **A template** — copy this folder to start a new skill.

## What to do when this skill is invoked

When the user invokes this skill, respond with a short confirmation that the
Greencar-UXD skill system is installed and working, then briefly tell them:

- Skills live in their own folder under `skills/`, each containing a `SKILL.md`.
- The `description` in the frontmatter is what lets Claude decide when to use a
  skill automatically — make it specific.
- To add a new skill, copy this folder, rename it, and rewrite `SKILL.md`.

If the user asks for more detail on authoring skills, read `reference.md` in this
same folder and walk them through it.

## How to turn this into your own skill

1. Copy the whole `skills/hello-greencar/` folder to `skills/<your-skill-name>/`.
2. Rename it to something descriptive (lowercase, hyphens).
3. Edit the frontmatter:
   - `name`: must match the folder name.
   - `description`: one or two sentences describing *when* to use it. This is the
     single most important field — Claude reads it to decide whether to invoke
     the skill, so be concrete about the trigger.
4. Replace this body with the actual instructions Claude should follow.
5. (Optional) Add supporting files in the folder (scripts, references, templates)
   and tell Claude to read them when relevant — like `reference.md` here.

## Notes

- A skill's body is only loaded when the skill is invoked, so it does not cost
  context until it is needed. Keep frequently-needed, always-on guidance in
  `CLAUDE.md` instead.
- Folder names and the `name` field should be lowercase with hyphens.
