# /help-agent

## Orchestrator
- Giris: gorev metni
- Cikis: skill + risk + preferred agent + subagent karari

## Komut
- `pwsh -NoProfile -File scripts/plan-task.ps1 -Task "azure deploy et, bug fix yap" -AsJson`

## Moduller
- `automation/skill-routing.json`
- `automation/policy.json`
- `automation/orchestrator-config.json`

## Test
- `pwsh -NoProfile -File scripts/tests/test-auto-agent.ps1`
