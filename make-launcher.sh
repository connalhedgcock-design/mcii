#!/bin/bash
# Builds a double-clickable MCII app in ~/Applications. Run once per machine.
#
# Not a packaged application -- a thin wrapper that starts the app exactly as `npm start` does.
# Deliberately so: the project has no build step, and adding a packaging tool would put a release
# process between either operator and a window on screen.
#
# ! built with osacompile rather than by hand. A hand-assembled .app bundle is refused by macOS
#   with error -10669 even after ad-hoc signing; an AppleScript app it trusts. Tried both.
# ! PATH is set explicitly inside. An app launched from the Dock never reads ~/.zshrc, so
#   Homebrew's node is not on its PATH -- the same gap that once made node look uninstalled.
set -e
cat > /tmp/mcii-launcher.applescript <<'AS'
on run
	if (do shell script "pgrep -f 'Electron.*MCII/app' >/dev/null 2>&1 && echo yes || echo no") is "yes" then
		tell application "Electron" to activate
		return
	end if
	do shell script "cd $HOME/Documents/MCII/app && PATH=/opt/homebrew/bin:/usr/local/bin:$PATH nohup npx electron . > /tmp/mcii-app.log 2>&1 &"
end run
AS
mkdir -p "$HOME/Applications"
rm -rf "$HOME/Applications/MCII.app"
osacompile -o "$HOME/Applications/MCII.app" /tmp/mcii-launcher.applescript
echo "Built ~/Applications/MCII.app — double-click it, or drag it to the Dock."
