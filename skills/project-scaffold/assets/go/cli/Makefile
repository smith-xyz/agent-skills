.PHONY: build run test lint

build:
	go build -o bin/PROJECTNAME ./cmd/PROJECTNAME

run:
	go run ./cmd/PROJECTNAME

test:
	go test -v ./...

lint:
	golangci-lint run
