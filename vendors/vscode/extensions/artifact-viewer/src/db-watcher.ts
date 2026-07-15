import * as fs from "fs";
import { ArtifactDbReader, getDomainConfigs } from "./db-reader";
import type { HostMessage } from "./types";

type LogFn = (msg: string) => void;
export type DataChangeHandler = (messages: HostMessage[]) => void;

export class DbWatcher {
  private fsWatcher?: fs.FSWatcher;
  private walWatcher?: fs.FSWatcher;
  private debounceTimer?: ReturnType<typeof setTimeout>;
  private lastEventSince?: string;
  private stopped = false;

  constructor(
    private readonly dbPath: string,
    private readonly schemasDir: string,
    private readonly onChange: DataChangeHandler,
    private readonly log: LogFn
  ) {}

  start(): void {
    this.log("Watcher: starting initial emit");
    void this.emitAll();

    try {
      this.fsWatcher = fs.watch(this.dbPath, () => this.scheduleEmit());
      this.fsWatcher.on("error", (err) => {
        this.log(`Watcher: fs.watch error (${err.message}), falling back to polling`);
        this.startWatchFileFallback();
      });
      this.log("Watcher: fs.watch active");
    } catch (err) {
      this.log(`Watcher: fs.watch failed (${err}), using polling`);
      this.startWatchFileFallback();
    }

    const walPath = `${this.dbPath}-wal`;
    try {
      if (fs.existsSync(walPath)) {
        this.walWatcher = fs.watch(walPath, () => this.scheduleEmit());
        this.walWatcher.on("error", () => {
          // WAL file may be deleted during checkpoint
        });
        this.log("Watcher: watching WAL file");
      }
    } catch {
      this.log("Watcher: WAL file not present, skipping WAL watch");
    }
  }

  stop(): void {
    this.stopped = true;
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = undefined;
    }
    this.fsWatcher?.close();
    this.fsWatcher = undefined;
    this.walWatcher?.close();
    this.walWatcher = undefined;
    fs.unwatchFile(this.dbPath);
    this.log("Watcher: stopped");
  }

  refresh(): void {
    this.log("Watcher: refresh requested");
    this.scheduleEmit();
  }

  private startWatchFileFallback(): void {
    if (this.stopped) return;
    this.fsWatcher?.close();
    this.fsWatcher = undefined;
    fs.watchFile(this.dbPath, { interval: 2000 }, () => this.scheduleEmit());
    this.log("Watcher: polling fallback active (2s interval)");
  }

  private scheduleEmit(): void {
    if (this.debounceTimer) clearTimeout(this.debounceTimer);
    this.debounceTimer = setTimeout(() => {
      this.debounceTimer = undefined;
      void this.emitAll();
    }, 100);
  }

  private async emitAll(): Promise<void> {
    if (!fs.existsSync(this.dbPath)) {
      this.log("Watcher: DB file not found, skipping emit");
      return;
    }

    try {
      const reader = new ArtifactDbReader(this.dbPath, this.log);
      const [artifacts, suggestions, links, events, openPrs] = await Promise.all([
        reader.getArtifacts(),
        reader.getSuggestions(),
        reader.getLinks(),
        reader.getEvents(this.lastEventSince),
        reader.getOpenPrs(),
      ]);

      const messages: HostMessage[] = [
        { type: "artifacts", data: artifacts },
        { type: "suggestions", data: suggestions },
        { type: "domains", data: getDomainConfigs(this.schemasDir) },
        { type: "links", data: links },
        { type: "open-prs", data: openPrs },
      ];

      if (events.length > 0) {
        this.lastEventSince = events[0].timestamp;
        for (const event of events) {
          messages.push({ type: "event", data: event });
        }
      }

      this.log(
        `Watcher: emitting ${messages.length} messages (${artifacts.length} artifacts, ${suggestions.length} suggestions, ${openPrs.length} PRs)`
      );
      this.onChange(messages);
    } catch (err) {
      const msg = err instanceof Error ? err.stack || err.message : String(err);
      this.log(`Watcher ERROR: ${msg}`);
    }
  }
}
