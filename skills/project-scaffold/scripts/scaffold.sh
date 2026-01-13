#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ASSETS_DIR="$SCRIPT_DIR/../assets"

usage() {
    echo "Usage: $0 <type> [template] <project-name>"
    echo ""
    echo "Types and templates:"
    echo "  go [cli|api]      - Go project (default: cli)"
    echo "  rust [cli|api]    - Rust project (default: cli)"
    echo "  node [cli|api]    - Node.js/TypeScript (default: cli)"
    echo "  python [cli|api]  - Python with uv (default: cli)"
    echo "  react [app]       - React + TypeScript (default: app)"
    echo ""
    echo "Examples:"
    echo "  $0 go my-tool           # Go CLI"
    echo "  $0 go api my-server     # Go API"
    echo "  $0 rust cli my-app      # Rust CLI"
    echo "  $0 node api my-backend  # Node API"
    echo "  $0 python my-script     # Python CLI"
    echo "  $0 python api my-api    # Python FastAPI"
    echo "  $0 react my-app         # React app"
    exit 1
}

if [ -z "$1" ]; then
    usage
fi

TYPE=$1
shift

# Determine template and project name
case $TYPE in
    go|rust|node|python)
        if [ "$1" = "cli" ] || [ "$1" = "api" ]; then
            TEMPLATE=$1
            shift
        else
            TEMPLATE="cli"
        fi
        ;;
    react)
        if [ "$1" = "app" ] || [ "$1" = "lib" ]; then
            TEMPLATE=$1
            shift
        else
            TEMPLATE="app"
        fi
        ;;
    *)
        echo "Unknown type: $TYPE"
        usage
        ;;
esac

if [ -z "$1" ]; then
    echo "Error: project name required"
    usage
fi

PROJECT_NAME=$1
TEMPLATE_DIR="$ASSETS_DIR/$TYPE/$TEMPLATE"

if [ ! -d "$TEMPLATE_DIR" ]; then
    echo "Error: Template not found: $TEMPLATE_DIR"
    exit 1
fi

echo "=== Creating $TYPE/$TEMPLATE project: $PROJECT_NAME ==="

# Copy template
cp -r "$TEMPLATE_DIR" "$PROJECT_NAME"
cd "$PROJECT_NAME"

# Replace placeholder with project name in file contents
find . -type f \( -name "*.go" -o -name "*.rs" -o -name "*.ts" -o -name "*.tsx" -o -name "*.py" -o -name "*.json" -o -name "*.toml" -o -name "*.mod" -o -name "*.html" -o -name "Makefile" -o -name "*.md" \) -exec sed -i '' "s/PROJECTNAME/$PROJECT_NAME/g" {} \;

# Rename PROJECTNAME directories (for Go cmd/ and Python src/)
find . -type d -name "PROJECTNAME" | while read dir; do
    mv "$dir" "$(dirname "$dir")/$PROJECT_NAME"
done

# Type-specific post-processing
case $TYPE in
    go)
        if command -v go &> /dev/null; then
            go mod tidy
        fi
        ;;
    rust)
        if command -v cargo &> /dev/null; then
            cargo check 2>/dev/null || true
        fi
        ;;
    node)
        if command -v bun &> /dev/null; then
            bun install
        elif command -v pnpm &> /dev/null; then
            pnpm install
        elif command -v npm &> /dev/null; then
            npm install
        fi
        ;;
    python)
        if command -v uv &> /dev/null; then
            uv venv
            uv pip install -e .
        else
            echo "Note: Install uv for best experience: curl -LsSf https://astral.sh/uv/install.sh | sh"
            python -m venv .venv
            .venv/bin/pip install -e .
        fi
        ;;
    react)
        if command -v pnpm &> /dev/null; then
            pnpm install
        elif command -v npm &> /dev/null; then
            npm install
        fi
        ;;
esac

echo ""
echo "=== Project created: $PROJECT_NAME ==="
echo "cd $PROJECT_NAME"
