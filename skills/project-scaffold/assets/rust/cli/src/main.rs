mod config;
mod error;

use clap::Parser;
use config::Config;
use error::Result;

#[derive(Parser)]
#[command(name = "PROJECTNAME")]
#[command(about = "A CLI tool")]
struct Cli {
    #[arg(short, long, default_value = "default")]
    name: String,

    #[arg(short, long, action = clap::ArgAction::Count)]
    verbose: u8,
}

#[tokio::main]
async fn main() -> Result<()> {
    let cli = Cli::parse();
    let config = Config::load();

    println!(
        "PROJECTNAME running in {} mode with name: {}",
        config.env, cli.name
    );

    Ok(())
}
