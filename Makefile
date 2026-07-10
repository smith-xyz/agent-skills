.PHONY: lint lint-fix install-deps \
       install-cursor install-claude install-codex install-vscode \
       install-cursor-workspace \
       remove-cursor remove-claude remove-codex remove-vscode

lint:
	markdownlint-cli2 "**/*.md"

lint-fix:
	markdownlint-cli2 --fix "**/*.md"

install-deps:
	brew install gh jq openshift-cli

install-cursor:
	./scripts/install-cursor.sh install

# Symlink into a workspace .cursor (requires TARGET=/path/to/.cursor)
install-cursor-workspace:
	@test -n "$(TARGET)" || (echo "Usage: make install-cursor-workspace TARGET=/path/to/.cursor"; exit 1)
	./scripts/install-cursor.sh install --target "$(TARGET)"

install-claude:
	./scripts/install-claude.sh install

install-codex:
	./scripts/install-codex.sh install

install-vscode:
	./scripts/install-vscode.sh install

remove-cursor:
	./scripts/install-cursor.sh remove

remove-claude:
	./scripts/install-claude.sh remove

remove-codex:
	./scripts/install-codex.sh remove

remove-vscode:
	./scripts/install-vscode.sh remove
