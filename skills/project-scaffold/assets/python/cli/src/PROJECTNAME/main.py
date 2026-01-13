#!/usr/bin/env python3
"""PROJECTNAME CLI entry point."""

import argparse
import logging
import sys

from PROJECTNAME.config import Config

logger = logging.getLogger(__name__)


def setup_logging(verbose: bool = False) -> None:
    """Configure logging for the application."""
    level = logging.DEBUG if verbose else logging.INFO
    logging.basicConfig(
        level=level,
        format="%(levelname)s: %(message)s",
    )


def main() -> int:
    """Main entry point for PROJECTNAME."""
    parser = argparse.ArgumentParser(description="PROJECTNAME CLI")
    parser.add_argument("--verbose", "-v", action="store_true", help="Verbose output")
    args = parser.parse_args()

    setup_logging(args.verbose)

    config = Config.load()
    logger.info(f"PROJECTNAME running in {config.env} mode")

    return 0


if __name__ == "__main__":
    sys.exit(main())
