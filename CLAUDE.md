## SDLC Workflow

```
Autonomous (beads, subagents):
/spec ──▶ /arch ──▶ /chunks-beads ──▶ /auto ──▶ (runs until done or paused)

```


### Full Ceremony (with beads, manual)

### Autonomous (with beads, subagents)

```bash
# Setup (once)
/spec                           # Write specification
/arch                           # Architecture decisions
/chunks-beads                   # Break down + create beads issues (note the label!)

# Run
/auto --label=<project>         # Implements chunks using subagents
                                # Pauses every 5 chunks (configurable)
                                # Run /auto again to continue

# Monitor
bd stats                        # Overall progress
bd ready --label=<project>      # What's next for this project
bd blocked --label=<project>    # What's stuck
```

This project uses **bd** (beads) for issue tracking. Run `bd onboard` to get started.

## Quick beads Reference

```bash
bd ready              # Find available work
bd show <id>          # View issue details
bd update <id> --status in_progress  # Claim work
bd close <id>         # Complete work
bd sync               # Sync with git
```
