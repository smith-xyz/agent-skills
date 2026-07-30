.PHONY: install-deps test \ install-cursor install-claude install-codex \
		install-vscode install-opencode install-cursor-workspace install-gates \
       	install-cursor-workspace install-gates remove-gates gate-report gate-doctor \
       	remove-cursor remove-claude remove-codex remove-vscode remove-opencode

test:
	cd tools/agent-gate && go test ./...

install-deps:
	brew install gh jq openshift-cli

# Gate engine — builds agent-gate and wires hooks into every vendor.
install-gates:
	./scripts/install-gates.sh install

remove-gates:
	./scripts/install-gates.sh remove

gate-report:
	@$${AGENT_GATE_HOME:-$$HOME/.agent-skills}/bin/agent-gate report

gate-doctor:
	@$${AGENT_GATE_HOME:-$$HOME/.agent-skills}/bin/agent-gate doctor

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
