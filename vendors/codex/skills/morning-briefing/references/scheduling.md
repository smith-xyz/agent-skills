# Scheduling Morning Briefings

## macOS (launchd) — recommended for laptops

launchd catches missed runs after sleep. Install via `scheduling/install-schedules.sh install`.

Plist at `~/Library/LaunchAgents/com.user.morning-briefing.plist`:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN"
  "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key><string>com.user.morning-briefing</string>
  <key>ProgramArguments</key>
  <array>
    <string>/bin/bash</string>
    <string>__SKILL_PATH__/scripts/morning-briefing.sh</string>
  </array>
  <key>StartCalendarInterval</key>
  <dict>
    <key>Hour</key><integer>7</integer>
    <key>Minute</key><integer>0</integer>
    <key>Weekday</key><integer>1</integer>
  </dict>
  <key>StartCalendarInterval</key>
  <array>
    <dict><key>Hour</key><integer>7</integer><key>Minute</key><integer>0</integer><key>Weekday</key><integer>1</integer></dict>
    <dict><key>Hour</key><integer>7</integer><key>Minute</key><integer>0</integer><key>Weekday</key><integer>2</integer></dict>
    <dict><key>Hour</key><integer>7</integer><key>Minute</key><integer>0</integer><key>Weekday</key><integer>3</integer></dict>
    <dict><key>Hour</key><integer>7</integer><key>Minute</key><integer>0</integer><key>Weekday</key><integer>4</integer></dict>
    <dict><key>Hour</key><integer>7</integer><key>Minute</key><integer>0</integer><key>Weekday</key><integer>5</integer></dict>
  </array>
  <key>EnvironmentVariables</key>
  <dict>
    <key>PATH</key><string>/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin</string>
  </dict>
  <key>StandardOutPath</key><string>__HOME__/.developer/morning-briefing/launchd.log</string>
  <key>StandardErrorPath</key><string>__HOME__/.developer/morning-briefing/launchd.err</string>
</dict>
</plist>
```

## Linux (crontab)

```crontab
0 7 * * 1-5 /bin/bash ~/.agent-skills/skills/morning-briefing/scripts/morning-briefing.sh >> ~/.developer/morning-briefing/cron.log 2>&1
```

## GitHub Actions

```yaml
name: Morning Briefing
on:
  schedule:
    - cron: '0 12 * * 1-5'  # UTC — adjust for your timezone
  workflow_dispatch:
jobs:
  digest:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Run briefing
        env:
          GH_TOKEN: ${{ secrets.GH_PAT }}
        run: bash skills/morning-briefing/scripts/morning-briefing.sh
```
