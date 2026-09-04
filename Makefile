.PHONY: install-deps install-cursor install-claude install-codex \
	install-vscode install-opencode install-pi install-reflect remove-reflect \
	remove-cursor remove-claude remove-codex remove-vscode remove-opencode \
	remove-pi reflect-test

install-deps:
	brew install gh jq openshift-cli

install-cursor:
	./scripts/install-cursor.sh install

install-claude:
	./scripts/install-claude.sh install

install-codex:
	./scripts/install-codex.sh install

install-vscode:
	./scripts/install-vscode.sh install

install-opencode:
	./scripts/install-opencode.sh install

install-pi:
	./scripts/install-pi.sh install

install-reflect:
	cd tools/reflect && CARGO_TARGET_DIR=target cargo build --release
	mkdir -p "$${AGENT_SKILLS_HOME:-$$HOME/.agent-skills}/bin"
	cp tools/reflect/target/release/reflect "$${AGENT_SKILLS_HOME:-$$HOME/.agent-skills}/bin/reflect"
	"$${AGENT_SKILLS_HOME:-$$HOME/.agent-skills}/bin/reflect" install

remove-reflect:
	@bin="$${AGENT_SKILLS_HOME:-$$HOME/.agent-skills}/bin/reflect"; \
	if [ -x "$$bin" ]; then "$$bin" remove; else echo "reflect binary not found"; fi

reflect-test:
	cd tools/reflect && CARGO_TARGET_DIR=target cargo test && CARGO_TARGET_DIR=target cargo clippy -- -D warnings

remove-cursor:
	./scripts/install-cursor.sh remove

remove-claude:
	./scripts/install-claude.sh remove

remove-codex:
	./scripts/install-codex.sh remove

remove-vscode:
	./scripts/install-vscode.sh remove

remove-opencode:
	./scripts/install-opencode.sh remove

remove-pi:
	./scripts/install-pi.sh remove
