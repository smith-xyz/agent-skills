.PHONY: lint lint-fix install-deps

lint:
	markdownlint-cli2 "**/*.md"

lint-fix:
	markdownlint-cli2 --fix "**/*.md"

install-deps:
	brew install markdownlint-cli2

install:
	./install-agent-skills.sh
