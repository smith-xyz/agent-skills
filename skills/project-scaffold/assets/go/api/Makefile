.PHONY: build test run lint fmt vet govulncheck gosec security check container

build:
	CGO_ENABLED=0 go build -ldflags="-s -w" -o bin/PROJECTNAME ./cmd/PROJECTNAME

test:
	go test ./...

run: build
	./bin/PROJECTNAME

lint:
	golangci-lint run

fmt:
	go fmt ./...

vet:
	go vet ./...

govulncheck:
	govulncheck ./...

gosec:
	gosec ./...

security: govulncheck gosec

check: fmt vet lint security test

container:
	podman build -t PROJECTNAME .
