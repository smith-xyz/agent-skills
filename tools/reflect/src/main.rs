use std::io::{self, Read};
use std::path::PathBuf;
use std::process::ExitCode;

use anyhow::{Context, Result};
use clap::{Parser, Subcommand};

use reflect::config::{user_home, ReflectConfig};
use reflect::digest::{run_digest, HeuristicDigester};
use reflect::hooks::{handle_session_start, handle_stop, normalize_payload};
use reflect::install;
use reflect::ledger::SqliteLedgerStore;
use reflect::review;
use reflect::types::HookEvent;

#[derive(Parser, Debug)]
#[command(name = "reflect", about = "Offline reflection engine for agent-skills")]
struct Cli {
    #[command(subcommand)]
    command: Commands,
}

#[derive(Subcommand, Debug)]
enum Commands {
    /// Lifecycle hooks (stdin JSON → stdout JSON). Always fail-open.
    Hook {
        #[command(subcommand)]
        event: HookCmd,
    },
    /// Cluster recent traces into review proposals.
    Digest {
        /// How many recent traces to consider.
        #[arg(long, default_value_t = 200)]
        limit: usize,
        /// Minimum cluster support to propose.
        #[arg(long, default_value_t = 3)]
        min_support: usize,
    },
    /// Show pending proposal counts and list.
    Status,
    /// Accept a proposal into catalog_path/shared/skills.
    Accept { id: String },
    /// Reject a proposal.
    Reject { id: String },
    /// List skill names under catalog_path.
    Catalog {
        /// Print absolute paths to SKILL.md instead of names.
        #[arg(long)]
        paths: bool,
    },
    /// Wire Claude/Cursor/VS Code hooks and write config.
    Install {
        /// Path to reflect binary (default: this executable).
        #[arg(long)]
        bin: Option<PathBuf>,
    },
    /// Remove reflect hooks from vendors.
    Remove,
}

#[derive(Subcommand, Debug)]
enum HookCmd {
    #[command(name = "session-start")]
    SessionStart,
    Stop,
}

fn main() -> ExitCode {
    match run() {
        Ok(code) => code,
        Err(err) => {
            eprintln!("reflect: {err:#}");
            ExitCode::from(1)
        }
    }
}

fn run() -> Result<ExitCode> {
    let cli = Cli::parse();
    match cli.command {
        Commands::Hook { event } => Ok(run_hook(event)),
        Commands::Digest { limit, min_support } => {
            cmd_digest(limit, min_support)?;
            Ok(ExitCode::SUCCESS)
        }
        Commands::Status => {
            cmd_status()?;
            Ok(ExitCode::SUCCESS)
        }
        Commands::Accept { id } => {
            let cfg = load_cfg()?;
            println!("{}", review::accept(&cfg, &id)?);
            Ok(ExitCode::SUCCESS)
        }
        Commands::Reject { id } => {
            let cfg = load_cfg()?;
            println!("{}", review::reject(&cfg, &id)?);
            Ok(ExitCode::SUCCESS)
        }
        Commands::Catalog { paths } => {
            cmd_catalog(paths)?;
            Ok(ExitCode::SUCCESS)
        }
        Commands::Install { bin } => {
            cmd_install(bin)?;
            Ok(ExitCode::SUCCESS)
        }
        Commands::Remove => {
            let cfg = load_cfg()?;
            install::remove(&cfg)?;
            Ok(ExitCode::SUCCESS)
        }
    }
}

fn load_cfg() -> Result<ReflectConfig> {
    let home = user_home().context("home")?;
    let cfg = ReflectConfig::load_or_default(&home).context("load config")?;
    cfg.ensure_dirs().context("ensure dirs")?;
    Ok(cfg)
}

fn open_ledger(cfg: &ReflectConfig) -> Result<SqliteLedgerStore> {
    SqliteLedgerStore::open(&cfg.ledger_path).context("open ledger")
}

/// Hooks never fail the vendor session.
fn run_hook(event: HookCmd) -> ExitCode {
    let output = (|| -> Result<String> {
        let mut raw = String::new();
        io::stdin().read_to_string(&mut raw)?;
        let normalized = normalize_payload(&raw);

        let home = match user_home() {
            Ok(h) => h,
            Err(_) => return Ok("{}".into()),
        };
        let cfg = ReflectConfig::load_or_default(&home).unwrap_or_else(|_| {
            ReflectConfig::default_for_home(&home)
        });
        let _ = cfg.ensure_dirs();

        match event {
            HookCmd::SessionStart => {
                let ev = match normalized {
                    HookEvent::Unknown => HookEvent::SessionStart {
                        session_id: "unknown".into(),
                        cwd: None,
                    },
                    other => other,
                };
                Ok(handle_session_start(&cfg, &ev))
            }
            HookCmd::Stop => {
                let ledger = match SqliteLedgerStore::open(&cfg.ledger_path) {
                    Ok(l) => l,
                    Err(err) => {
                        eprintln!("reflect: ledger: {err}");
                        return Ok("{}".into());
                    }
                };
                let ev = match normalized {
                    HookEvent::Unknown => HookEvent::Stop {
                        session_id: "unknown".into(),
                        cwd: None,
                        prompt: None,
                        status: None,
                    },
                    other => other,
                };
                Ok(handle_stop(&cfg, &ledger, &ev))
            }
        }
    })();

    match output {
        Ok(s) => {
            println!("{s}");
            ExitCode::SUCCESS
        }
        Err(err) => {
            eprintln!("reflect hook error: {err:#}");
            println!("{{}}");
            ExitCode::SUCCESS
        }
    }
}

fn cmd_digest(limit: usize, min_support: usize) -> Result<()> {
    let cfg = load_cfg()?;
    let ledger = open_ledger(&cfg)?;
    let skills = review::existing_skill_names(&cfg.catalog_path);
    let digester = HeuristicDigester {
        existing_skills: skills,
        min_support,
    };
    let proposals = run_digest(&ledger, &digester, limit)?;
    let n = review::write_proposals(&cfg, &proposals)?;
    println!("wrote {n} proposal(s) → {}", cfg.review_dir.display());
    if n > 0 {
        review::print_list(&cfg)?;
    }
    Ok(())
}

fn cmd_status() -> Result<()> {
    let cfg = load_cfg()?;
    let st = review::status(&cfg)?;
    println!("{}", st.format_line());
    review::print_list(&cfg)?;
    Ok(())
}

fn cmd_catalog(paths: bool) -> Result<()> {
    let cfg = load_cfg()?;
    let skills = cfg.catalog_path.join("shared/skills");
    let entries = std::fs::read_dir(&skills).with_context(|| format!("{}", skills.display()))?;
    let mut names: Vec<_> = entries
        .filter_map(|e| e.ok())
        .filter(|e| e.path().join("SKILL.md").is_file())
        .collect();
    names.sort_by_key(|e| e.file_name());
    for e in names {
        if paths {
            println!("{}", e.path().join("SKILL.md").display());
        } else {
            println!("{}", e.file_name().to_string_lossy());
        }
    }
    Ok(())
}

fn cmd_install(bin: Option<PathBuf>) -> Result<()> {
    let home = user_home()?;
    let mut cfg = ReflectConfig::load_or_default(&home)?;
    // Prefer catalog from this repo when installing from Makefile
    if let Ok(manifest) = std::env::var("CARGO_MANIFEST_DIR") {
        let repo = PathBuf::from(&manifest)
            .parent()
            .and_then(|p| p.parent())
            .map(|p| p.to_path_buf());
        if let Some(repo) = repo {
            if repo.join("shared/skills").is_dir() {
                cfg.catalog_path = repo;
            }
        }
    }
    cfg.ensure_dirs()?;

    let bin_path = match bin {
        Some(p) => p,
        None => std::env::current_exe().context("current_exe")?,
    };
    let dest = home.join(".agent-skills/bin/reflect");
    if bin_path != dest {
        install::install_binary(&bin_path, &dest)?;
    }
    install::install(&cfg, &dest)?;
    Ok(())
}
