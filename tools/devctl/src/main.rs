use std::{
    env, fs,
    io::{Read, Write},
    net::TcpStream,
    path::{Path, PathBuf},
    process::{Command, ExitCode, Stdio},
    time::{Duration, SystemTime},
};

type Result<T> = std::result::Result<T, Box<dyn std::error::Error>>;

#[derive(Debug)]
struct Context {
    root: PathBuf,
    frontend: PathBuf,
}

#[derive(Debug)]
struct Check {
    name: &'static str,
    ok: bool,
    required: bool,
    detail: String,
}

fn main() -> ExitCode {
    let ctx = match Context::new() {
        Ok(ctx) => ctx,
        Err(err) => {
            eprintln!("failed to locate repository root: {err}");
            return ExitCode::FAILURE;
        }
    };

    let mut args = env::args().skip(1);
    let command = args.next().unwrap_or_else(|| "help".to_string());
    let result = match command.as_str() {
        "doctor" => doctor(&ctx),
        "setup-db" => setup_db(&ctx),
        "build" => build(&ctx),
        "test" => test(&ctx),
        "runtime-check" => runtime_check(&ctx),
        "runtime-mpv-check" => runtime_mpv_check(&ctx),
        "runtime-mpv-loadplan-check" => runtime_mpv_loadplan_check(&ctx),
        "health" => health(
            args.next()
                .as_deref()
                .unwrap_or("http://localhost:1337/health"),
        ),
        "snapshot" => {
            let url = args
                .next()
                .unwrap_or_else(|| "http://localhost:1337/health".to_string());
            snapshot(&ctx, &url)
        }
        "logs" => {
            let lines = match args.next() {
                Some(value) => match value.parse::<usize>() {
                    Ok(lines) => lines,
                    Err(err) => {
                        return {
                            eprintln!("invalid logs line count: {err}");
                            ExitCode::FAILURE
                        };
                    }
                },
                None => 120,
            };
            logs(&ctx, lines)
        }
        "nas-media" | "nas" => nas_media(&ctx),
        "run" | "start-detached" => start_detached(&ctx),
        "stop" => stop_detached(&ctx),
        "restart" => restart_detached(&ctx),
        "status" => status(&ctx),
        "start-headless" => start_headless(&ctx),
        "frontend-dev" => frontend_dev(&ctx),
        "help" | "--help" | "-h" => {
            help();
            Ok(())
        }
        other => Err(format!("unknown command: {other}").into()),
    };

    match result {
        Ok(()) => ExitCode::SUCCESS,
        Err(err) => {
            eprintln!("{err}");
            ExitCode::FAILURE
        }
    }
}

impl Context {
    fn new() -> Result<Self> {
        let mut dir = env::current_dir()?;
        loop {
            if dir.join("package.json").exists() && dir.join("kmfrontend").exists() {
                return Ok(Self {
                    frontend: dir.join("kmfrontend"),
                    root: dir,
                });
            }
            if !dir.pop() {
                return Err(
                    "could not find package.json and kmfrontend in parent directories".into(),
                );
            }
        }
    }
}

fn help() {
    println!(
        "OpenKTV development helper

Usage:
  yarn dev:doctor              Check local runtime, build artifacts, and system dependencies
  yarn dev:setup-db            Create local PostgreSQL user/db and app/config.yml
  yarn dev:build               Build backend and frontend
  yarn dev:test                Run typecheck and unit tests
  yarn dev:runtime-check       Build and smoke-test the Rust playback runtime
  yarn dev:runtime-mpv-check   Smoke-test the Rust runtime with a real mpv IPC process
  yarn dev:runtime-mpv-loadplan-check
                               Smoke-test Rust runtime loadPlan with a local media file
  yarn dev:health [url]        Fetch /health from a running instance
  yarn dev:snapshot [url]      Print a local appliance diagnostic snapshot
  yarn dev:logs [lines]        Print the tail of the latest app log
  yarn dev:nas                 Check the Feiniu SMB media mount
  yarn dev:run                 Build and start the app detached in appliance dev mode
  yarn dev:stop                Stop the detached app and mpv runtime
  yarn dev:restart             Stop, build, and start detached again
  yarn dev:status              Print detached process and health status
  yarn dev:start-headless      Run the Electron CLI entrypoint after preflight checks
  yarn dev:frontend            Start Vite frontend dev server"
    );
}

fn doctor(ctx: &Context) -> Result<()> {
    let mut checks = vec![
        check_node_version(),
        check_command("corepack", true),
        check_command("mpv", true),
        check_command("ffmpeg", true),
        check_command("patch", true),
        check_command("postgres", false),
        check_command("psql", true),
        check_command("pg_ctl", false),
        check_path("root node_modules", &ctx.root.join("node_modules"), true),
        check_path(
            "frontend node_modules",
            &ctx.frontend.join("node_modules"),
            true,
        ),
        check_path("backend dist", &ctx.root.join("dist/index.mjs"), true),
        check_path("frontend dist", &ctx.frontend.join("dist/index.html"), true),
        check_path("src/lib submodule", &ctx.root.join("src/lib/.git"), true),
        check_path(
            "systemRepo submodule",
            &ctx.root.join("assets/systemRepo/.git"),
            true,
        ),
        check_path(
            "guestAvatars submodule",
            &ctx.root.join("assets/guestAvatars/.git"),
            true,
        ),
        check_path("portable config", &ctx.root.join("app/config.yml"), false),
        check_postgres_cluster(),
    ];

    let width = checks
        .iter()
        .map(|check| check.name.len())
        .max()
        .unwrap_or(0);
    for check in &checks {
        let mark = if check.ok {
            "OK "
        } else if check.required {
            "ERR"
        } else {
            "WARN"
        };
        println!("{mark} {:width$} {}", check.name, check.detail);
    }

    if checks.iter_mut().any(|check| check.required && !check.ok) {
        return Err("required preflight checks failed".into());
    }
    Ok(())
}

fn setup_db(ctx: &Context) -> Result<()> {
    let db_name = env::var("KM_DEV_DB").unwrap_or_else(|_| "karaokemugen_app".to_string());
    let db_user = env::var("KM_DEV_DB_USER").unwrap_or_else(|_| "karaokemugen_app".to_string());
    let db_password = env::var("KM_DEV_DB_PASSWORD").unwrap_or_else(|_| "musubi".to_string());
    let port = env::var("KM_DEV_DB_PORT").unwrap_or_else(|_| "5432".to_string());

    run(
        "sudo",
        &["-u", "postgres", "psql", "-tAc", "SELECT 1"],
        &ctx.root,
        None,
    )?;

    let role_query = format!("SELECT 1 FROM pg_roles WHERE rolname='{db_user}'");
    if capture(
        "sudo",
        &["-u", "postgres", "psql", "-tAc", &role_query],
        &ctx.root,
    )?
    .trim()
        != "1"
    {
        let create_role = format!("CREATE USER {db_user} WITH ENCRYPTED PASSWORD '{db_password}';");
        run(
            "sudo",
            &["-u", "postgres", "psql", "-c", &create_role],
            &ctx.root,
            None,
        )?;
    }

    let db_query = format!("SELECT 1 FROM pg_database WHERE datname='{db_name}'");
    if capture(
        "sudo",
        &["-u", "postgres", "psql", "-tAc", &db_query],
        &ctx.root,
    )?
    .trim()
        != "1"
    {
        run(
            "sudo",
            &[
                "-u", "postgres", "createdb", "-E", "UTF8", "-O", &db_user, &db_name,
            ],
            &ctx.root,
            None,
        )?;
    }

    let grants = format!(
        "CREATE EXTENSION IF NOT EXISTS unaccent; GRANT CREATE ON SCHEMA public TO public; GRANT ALL PRIVILEGES ON DATABASE {db_name} TO {db_user};"
    );
    run(
        "sudo",
        &["-u", "postgres", "psql", "-d", &db_name, "-c", &grants],
        &ctx.root,
        None,
    )?;

    let app_dir = ctx.root.join("app");
    fs::create_dir_all(&app_dir)?;
    let config_path = app_dir.join("config.yml");
    if !config_path.exists() {
        let config = format!(
            "App:
  Language: zh-Hans
System:
  Database:
    bundledPostgresBinary: false
    connection: tcp
    database: {db_name}
    host: localhost
    password: {db_password}
    port: {port}
    username: {db_user}
"
        );
        fs::write(&config_path, config)?;
        println!("Wrote {}", config_path.display());
    } else {
        println!(
            "{} already exists; left it unchanged.",
            config_path.display()
        );
    }

    Ok(())
}

fn build(ctx: &Context) -> Result<()> {
    run(
        "cargo",
        &["build", "--manifest-path", "tools/runtime/Cargo.toml"],
        &ctx.root,
        None,
    )?;
    run_yarn(&["build"], &ctx.root)?;
    run_yarn(&["buildkmfrontend"], &ctx.root)?;
    Ok(())
}

fn test(ctx: &Context) -> Result<()> {
    run(
        "cargo",
        &["check", "--manifest-path", "tools/runtime/Cargo.toml"],
        &ctx.root,
        None,
    )?;
    run_yarn(&["typecheck"], &ctx.root)?;
    run_yarn(&["test:unit"], &ctx.root)?;
    Ok(())
}

fn runtime_check(ctx: &Context) -> Result<()> {
    runtime_smoke(ctx, false, false)
}

fn runtime_mpv_check(ctx: &Context) -> Result<()> {
    runtime_smoke(ctx, true, false)
}

fn runtime_mpv_loadplan_check(ctx: &Context) -> Result<()> {
    runtime_smoke(ctx, true, true)
}

fn runtime_smoke(ctx: &Context, mpv: bool, load_plan: bool) -> Result<()> {
    run(
        "cargo",
        &["check", "--manifest-path", "tools/runtime/Cargo.toml"],
        &ctx.root,
        None,
    )?;

    let mut args = vec![
        "run",
        "--quiet",
        "--manifest-path",
        "tools/runtime/Cargo.toml",
    ];
    if mpv {
        args.push("--");
        args.push("--mpv");
    }

    let mut command = Command::new("cargo");
    command
        .args(args)
        .current_dir(&ctx.root)
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .stderr(Stdio::inherit());
    if mpv {
        command.env("OPENKTV_RUNTIME_MPV_ARGS", "--vo=null --ao=null");
    }

    let smoke_media = if load_plan {
        Some(write_runtime_smoke_wav(ctx)?)
    } else {
        None
    };

    let mut child = command.spawn()?;

    {
        let stdin = child.stdin.as_mut().ok_or("runtime stdin unavailable")?;
        stdin.write_all(br#"{"requestId":"devctl-ping","kind":"ping"}"#)?;
        stdin.write_all(b"\n")?;
        if mpv {
            stdin.write_all(
                br#"{"requestId":"devctl-volume","kind":"setVolume","payload":{"volume":50}}"#,
            )?;
            stdin.write_all(b"\n")?;
        }
        if let Some(media_path) = smoke_media.as_ref() {
            let load_plan = format!(
                r#"{{"requestId":"devctl-loadplan","kind":"loadPlan","payload":{{"id":"devctl-smoke","mediaType":"song","mediaPath":"{}","mpvOptions":{{}},"displayInfo":"OpenKTV runtime smoke","createdAt":"devctl"}}}}"#,
                json_escape(&media_path.display().to_string())
            );
            stdin.write_all(load_plan.as_bytes())?;
            stdin.write_all(b"\n")?;
            stdin.write_all(br#"{"requestId":"devctl-play","kind":"play"}"#)?;
            stdin.write_all(b"\n")?;
            stdin.write_all(br#"{"requestId":"devctl-pause","kind":"pause"}"#)?;
            stdin.write_all(b"\n")?;
            stdin.write_all(br#"{"requestId":"devctl-stop","kind":"stop"}"#)?;
            stdin.write_all(b"\n")?;
        }
    }
    drop(child.stdin.take());

    let mut output = String::new();
    child
        .stdout
        .as_mut()
        .ok_or("runtime stdout unavailable")?
        .read_to_string(&mut output)?;
    let status = child.wait()?;
    print_block(output.clone());

    if !status.success() {
        return Err(format!("runtime smoke test failed with status {status}").into());
    }
    if !output.contains(r#""type":"runtimeReady""#)
        || !output.contains(r#""requestId":"devctl-ping""#)
    {
        return Err("runtime smoke test did not produce ready and ping ack events".into());
    }
    if mpv
        && (!output.contains(r#""backend":"mpv""#)
            || !output.contains(r#""requestId":"devctl-volume""#))
    {
        return Err(
            "mpv runtime smoke test did not produce mpv backend and volume ack events".into(),
        );
    }
    if load_plan
        && (!output.contains(r#""requestId":"devctl-loadplan""#)
            || !output.contains(r#""currentPlanId":"devctl-smoke""#)
            || !output.contains(r#""requestId":"devctl-stop""#))
    {
        return Err(
            "mpv runtime loadPlan smoke test did not load and stop the local media plan".into(),
        );
    }
    Ok(())
}

fn write_runtime_smoke_wav(ctx: &Context) -> Result<PathBuf> {
    let path = ctx.root.join("app/run/openktv-runtime-smoke.wav");
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent)?;
    }

    let sample_rate = 8000u32;
    let seconds = 1u32;
    let channels = 1u16;
    let bits_per_sample = 16u16;
    let byte_rate = sample_rate * channels as u32 * bits_per_sample as u32 / 8;
    let block_align = channels * bits_per_sample / 8;
    let data_size = sample_rate * seconds * block_align as u32;
    let riff_size = 36 + data_size;

    let mut wav = Vec::with_capacity((44 + data_size) as usize);
    wav.extend_from_slice(b"RIFF");
    wav.extend_from_slice(&riff_size.to_le_bytes());
    wav.extend_from_slice(b"WAVEfmt ");
    wav.extend_from_slice(&16u32.to_le_bytes());
    wav.extend_from_slice(&1u16.to_le_bytes());
    wav.extend_from_slice(&channels.to_le_bytes());
    wav.extend_from_slice(&sample_rate.to_le_bytes());
    wav.extend_from_slice(&byte_rate.to_le_bytes());
    wav.extend_from_slice(&block_align.to_le_bytes());
    wav.extend_from_slice(&bits_per_sample.to_le_bytes());
    wav.extend_from_slice(b"data");
    wav.extend_from_slice(&data_size.to_le_bytes());
    wav.resize((44 + data_size) as usize, 0);
    fs::write(&path, wav)?;
    Ok(path)
}

fn json_escape(value: &str) -> String {
    value
        .replace('\\', "\\\\")
        .replace('"', "\\\"")
        .replace('\n', "\\n")
        .replace('\r', "\\r")
}

fn health(url: &str) -> Result<()> {
    let response = fetch_http(url)?;
    println!("{}", response.status);
    println!("{}", response.body);
    if !response.status.contains(" 200 ") {
        return Err(format!(
            "health endpoint returned non-OK status: {}",
            response.status
        )
        .into());
    }
    Ok(())
}

fn snapshot(ctx: &Context, url: &str) -> Result<()> {
    println!("OpenKTV appliance snapshot");
    println!("root: {}", ctx.root.display());
    println!(
        "branch: {}",
        capture_optional("git", &["branch", "--show-current"], &ctx.root)
    );
    println!(
        "revision: {}",
        capture_optional("git", &["rev-parse", "--short", "HEAD"], &ctx.root)
    );
    println!("config: {}", ctx.root.join("app/config.yml").display());

    println!("\nTools");
    print_version("node", &["--version"], &ctx.root);
    print_version("corepack", &["--version"], &ctx.root);
    print_version("mpv", &["--version"], &ctx.root);
    print_version("ffmpeg", &["-version"], &ctx.root);
    print_version("psql", &["--version"], &ctx.root);

    println!("\nPostgreSQL");
    print_block(capture_optional("pg_lsclusters", &[], &ctx.root));

    println!("\nProcesses");
    let processes = capture_optional(
        "pgrep",
        &[
            "-af",
            "(electron|mpv|node .*karaokemugen|node .*openktv|node .*dist/index|km-devctl|openktv-devctl)",
        ],
        &ctx.root,
    );
    print_block(processes);

    println!("\nHealth {url}");
    match fetch_http(url) {
        Ok(response) => {
            println!("{}", response.status);
            print_block(response.body);
        }
        Err(err) => println!("unavailable: {err}"),
    }

    println!("\nLatest log");
    match latest_log_file(&ctx.root.join("app/logs"))? {
        Some(path) => println!("{}", path.display()),
        None => println!("none"),
    }
    Ok(())
}

fn logs(ctx: &Context, lines: usize) -> Result<()> {
    let logs_dir = ctx.root.join("app/logs");
    let Some(path) = latest_log_file(&logs_dir)? else {
        println!("No log files found in {}", logs_dir.display());
        return Ok(());
    };
    let content = fs::read_to_string(&path)?;
    let mut tail = content.lines().rev().take(lines).collect::<Vec<_>>();
    tail.reverse();
    println!("==> {} <==", path.display());
    for line in tail {
        println!("{line}");
    }
    Ok(())
}

fn start_detached(ctx: &Context) -> Result<()> {
    if let Some(pid) = read_pid(ctx)? {
        if process_alive(pid) {
            println!("OpenKTV is already running with pid {pid}");
            return status(ctx);
        }
    }

    doctor(ctx)?;
    build(ctx)?;
    fs::create_dir_all(ctx.root.join("app/run"))?;

    let log_path = detached_log_path(ctx);
    let stdout = fs::OpenOptions::new()
        .create(true)
        .append(true)
        .open(&log_path)?;
    let stderr = stdout.try_clone()?;
    let electron = electron_binary(ctx);

    let mut command = if command_available("setsid") {
        let mut command = Command::new("setsid");
        command.arg(&electron);
        command
    } else {
        Command::new(&electron)
    };
    command
        .args([".", "--cli"])
        .current_dir(&ctx.root)
        .stdin(Stdio::null())
        .stdout(Stdio::from(stdout))
        .stderr(Stdio::from(stderr))
        .env_remove("ELECTRON_RUN_AS_NODE")
        .env("ELECTRON_DISABLE_SANDBOX", "1");

    let child = command.spawn()?;
    fs::write(pid_path(ctx), format!("{}\n", child.id()))?;
    println!(
        "Started OpenKTV detached with pid {}. Log: {}",
        child.id(),
        log_path.display()
    );
    Ok(())
}

fn stop_detached(ctx: &Context) -> Result<()> {
    if let Some(pid) = read_pid(ctx)? {
        if process_alive(pid) {
            println!("Stopping pid {pid}");
            kill_pid(pid)?;
            wait_until_stopped(pid, Duration::from_secs(10));
        }
    }

    kill_matching("node_modules/electron/dist/electron . --cli")?;
    kill_matching("node_modules/electron/dist/electron --type=")?;
    kill_matching("/usr/bin/mpv --idle --msg-level=all=no,ipc=v")?;

    let pid_path = pid_path(ctx);
    if pid_path.exists() {
        fs::remove_file(pid_path)?;
    }
    println!("Stopped OpenKTV detached runtime");
    Ok(())
}

fn restart_detached(ctx: &Context) -> Result<()> {
    stop_detached(ctx)?;
    start_detached(ctx)
}

fn status(ctx: &Context) -> Result<()> {
    match read_pid(ctx)? {
        Some(pid) if process_alive(pid) => println!("detached pid: {pid} (running)"),
        Some(pid) => println!("detached pid: {pid} (not running)"),
        None => println!("detached pid: none"),
    }

    match fetch_http("http://localhost:1337/health") {
        Ok(response) => {
            println!("{}", response.status);
            print_block(response.body);
        }
        Err(err) => println!("health unavailable: {err}"),
    }
    Ok(())
}

fn nas_media(ctx: &Context) -> Result<()> {
    let smb_url =
        env::var("OPENKTV_NAS_SMB").unwrap_or_else(|_| "smb://192.168.0.109/nas_hdd/".to_string());
    let mount_path = env::var("OPENKTV_NAS_MOUNT")
        .map(PathBuf::from)
        .unwrap_or_else(|_| ctx.root.join("app/media/nas_hdd"));

    fs::create_dir_all(mount_path.join("kara.moe/medias"))?;
    fs::create_dir_all(mount_path.join("My Custom Songs/medias"))?;

    println!("OpenKTV NAS media");
    println!("smb: {}", smb_url);
    println!("mount: {}", mount_path.display());
    println!("exists: {}", mount_path.exists());
    println!("mounted: {}", path_is_mount_target(ctx, &mount_path));
    println!("writable: {}", path_is_writable(&mount_path));
    println!("\nExpected repository media paths:");
    println!("{}", mount_path.join("kara.moe/medias").display());
    println!("{}", mount_path.join("My Custom Songs/medias").display());
    Ok(())
}

fn path_is_mount_target(ctx: &Context, path: &Path) -> bool {
    let target = capture_optional(
        "findmnt",
        &["-T", &path.display().to_string(), "-n", "-o", "TARGET"],
        &ctx.root,
    );
    target
        .lines()
        .next()
        .map(|line| Path::new(line.trim()) == path)
        .unwrap_or(false)
}

fn path_is_writable(path: &Path) -> bool {
    let test_file = path.join(".openktv-write-test");
    match fs::OpenOptions::new()
        .create(true)
        .write(true)
        .truncate(true)
        .open(&test_file)
    {
        Ok(_) => {
            let _ = fs::remove_file(test_file);
            true
        }
        Err(_) => false,
    }
}

struct HttpResponse {
    status: String,
    body: String,
}

fn fetch_http(url: &str) -> Result<HttpResponse> {
    let parsed = parse_http_url(url)?;
    let mut stream = TcpStream::connect((&*parsed.host, parsed.port))?;
    stream.set_read_timeout(Some(Duration::from_secs(5)))?;
    stream.write_all(
        format!(
            "GET {} HTTP/1.1\r\nHost: {}\r\nConnection: close\r\n\r\n",
            parsed.path, parsed.host
        )
        .as_bytes(),
    )?;
    let mut response = String::new();
    stream.read_to_string(&mut response)?;
    let mut parts = response.splitn(2, "\r\n\r\n");
    let header = parts.next().unwrap_or_default();
    let body = parts.next().unwrap_or_default();
    let status = header.lines().next().unwrap_or("HTTP/1.1 000 Unknown");
    Ok(HttpResponse {
        status: status.to_string(),
        body: body.to_string(),
    })
}

fn start_headless(ctx: &Context) -> Result<()> {
    doctor(ctx)?;
    run_yarn(&["build"], &ctx.root)?;
    let electron = ctx.root.join("node_modules/.bin/electron");
    let mut envs: Vec<(String, String)> = env::vars().collect();
    envs.retain(|(key, _)| key != "ELECTRON_RUN_AS_NODE");
    envs.push(("ELECTRON_DISABLE_SANDBOX".to_string(), "1".to_string()));
    run_path(&electron, &[".", "--cli"], &ctx.root, Some(&envs))?;
    Ok(())
}

fn frontend_dev(ctx: &Context) -> Result<()> {
    run_yarn(&["startkmfrontend"], &ctx.root)
}

fn pid_path(ctx: &Context) -> PathBuf {
    ctx.root.join("app/run/devctl.pid")
}

fn detached_log_path(ctx: &Context) -> PathBuf {
    ctx.root.join("app/run/devctl-headless.log")
}

fn electron_binary(ctx: &Context) -> PathBuf {
    let binary = ctx.root.join("node_modules/electron/dist/electron");
    if binary.exists() {
        binary
    } else {
        ctx.root.join("node_modules/.bin/electron")
    }
}

fn read_pid(ctx: &Context) -> Result<Option<u32>> {
    let path = pid_path(ctx);
    if !path.exists() {
        return Ok(None);
    }
    let content = fs::read_to_string(path)?;
    Ok(content.trim().parse::<u32>().ok())
}

fn process_alive(pid: u32) -> bool {
    Command::new("kill")
        .args(["-0", &pid.to_string()])
        .status()
        .map(|status| status.success())
        .unwrap_or(false)
}

fn kill_pid(pid: u32) -> Result<()> {
    let status = Command::new("kill")
        .args(["-TERM", &pid.to_string()])
        .status()?;
    if !status.success() && process_alive(pid) {
        return Err(format!("failed to stop pid {pid}").into());
    }
    Ok(())
}

fn wait_until_stopped(pid: u32, timeout: Duration) {
    let deadline = SystemTime::now() + timeout;
    while process_alive(pid) && SystemTime::now() < deadline {
        std::thread::sleep(Duration::from_millis(250));
    }
}

fn kill_matching(pattern: &str) -> Result<()> {
    for pid in pids_matching(pattern)? {
        let _ = kill_pid(pid);
        wait_until_stopped(pid, Duration::from_secs(3));
    }
    Ok(())
}

fn pids_matching(pattern: &str) -> Result<Vec<u32>> {
    let output = Command::new("pgrep").args(["-f", pattern]).output()?;
    if !output.status.success() {
        return Ok(Vec::new());
    }
    Ok(String::from_utf8_lossy(&output.stdout)
        .lines()
        .filter_map(|line| line.trim().parse::<u32>().ok())
        .collect())
}

fn command_available(command: &str) -> bool {
    Command::new("sh")
        .args(["-lc", &format!("command -v {command} >/dev/null 2>&1")])
        .status()
        .map(|status| status.success())
        .unwrap_or(false)
}

fn run_yarn(args: &[&str], cwd: &Path) -> Result<()> {
    let mut full_args = vec!["yarn"];
    full_args.extend_from_slice(args);
    run("corepack", &full_args, cwd, None)
}

fn run(command: &str, args: &[&str], cwd: &Path, envs: Option<&[(String, String)]>) -> Result<()> {
    run_command(Command::new(command), args, cwd, envs)
}

fn run_path(
    command: &Path,
    args: &[&str],
    cwd: &Path,
    envs: Option<&[(String, String)]>,
) -> Result<()> {
    run_command(Command::new(command), args, cwd, envs)
}

fn run_command(
    mut command: Command,
    args: &[&str],
    cwd: &Path,
    envs: Option<&[(String, String)]>,
) -> Result<()> {
    command
        .args(args)
        .current_dir(cwd)
        .stdin(Stdio::inherit())
        .stdout(Stdio::inherit())
        .stderr(Stdio::inherit());
    if let Some(envs) = envs {
        command.env_clear();
        for (key, value) in envs {
            command.env(key, value);
        }
    }
    let status = command.status()?;
    if !status.success() {
        return Err(format!("command failed: {:?} {:?}", command.get_program(), args).into());
    }
    Ok(())
}

fn capture(command: &str, args: &[&str], cwd: &Path) -> Result<String> {
    let output = Command::new(command).args(args).current_dir(cwd).output()?;
    if !output.status.success() {
        return Err(format!("command failed: {command} {args:?}").into());
    }
    Ok(String::from_utf8_lossy(&output.stdout).to_string())
}

fn capture_optional(command: &str, args: &[&str], cwd: &Path) -> String {
    match Command::new(command).args(args).current_dir(cwd).output() {
        Ok(output) if output.status.success() => {
            String::from_utf8_lossy(&output.stdout).trim().to_string()
        }
        Ok(output) => {
            let stderr = String::from_utf8_lossy(&output.stderr).trim().to_string();
            if stderr.is_empty() {
                String::new()
            } else {
                stderr
            }
        }
        Err(err) => format!("unavailable ({err})"),
    }
}

fn print_version(command: &str, args: &[&str], cwd: &Path) {
    let output = capture_optional(command, args, cwd);
    println!(
        "{command}: {}",
        output
            .lines()
            .next()
            .filter(|line| !line.is_empty())
            .unwrap_or("unavailable")
    );
}

fn print_block(output: String) {
    if output.trim().is_empty() {
        println!("none");
    } else {
        println!("{output}");
    }
}

fn latest_log_file(logs_dir: &Path) -> Result<Option<PathBuf>> {
    if !logs_dir.exists() {
        return Ok(None);
    }
    let mut latest: Option<(SystemTime, PathBuf)> = None;
    for entry in fs::read_dir(logs_dir)? {
        let entry = entry?;
        if !entry.file_type()?.is_file() {
            continue;
        }
        let modified = entry
            .metadata()?
            .modified()
            .unwrap_or(SystemTime::UNIX_EPOCH);
        match &latest {
            Some((latest_modified, _)) if modified <= *latest_modified => {}
            _ => latest = Some((modified, entry.path())),
        }
    }
    Ok(latest.map(|(_, path)| path))
}

fn check_command(command: &'static str, required: bool) -> Check {
    let output = Command::new("sh")
        .args(["-lc", &format!("command -v {command}")])
        .output();
    match output {
        Ok(output) if output.status.success() => Check {
            name: command,
            ok: true,
            required,
            detail: String::from_utf8_lossy(&output.stdout).trim().to_string(),
        },
        _ => Check {
            name: command,
            ok: false,
            required,
            detail: "not found".to_string(),
        },
    }
}

fn check_path(name: &'static str, path: &Path, required: bool) -> Check {
    Check {
        name,
        ok: path.exists(),
        required,
        detail: path.display().to_string(),
    }
}

fn check_node_version() -> Check {
    let output = Command::new("node").arg("-v").output();
    let version = match output {
        Ok(output) if output.status.success() => {
            String::from_utf8_lossy(&output.stdout).trim().to_string()
        }
        _ => "not found".to_string(),
    };
    let ok = compare_versions(&version, "24.14.0");
    Check {
        name: "node",
        ok,
        required: false,
        detail: format!("{version} expected >=24.14.0"),
    }
}

fn check_postgres_cluster() -> Check {
    let output = Command::new("sh")
        .args([
            "-lc",
            "pg_lsclusters 2>/dev/null | awk 'NR>1 {print $4}' | grep -q online",
        ])
        .output();
    let ok = output.map(|out| out.status.success()).unwrap_or(false);
    Check {
        name: "postgres cluster online",
        ok,
        required: true,
        detail: if ok { "online" } else { "not online" }.to_string(),
    }
}

fn compare_versions(actual: &str, minimum: &str) -> bool {
    let actual = parse_version(actual.trim_start_matches('v'));
    let minimum = parse_version(minimum);
    actual >= minimum
}

fn parse_version(input: &str) -> Vec<u32> {
    input
        .split('.')
        .map(|part| part.parse::<u32>().unwrap_or(0))
        .collect()
}

struct ParsedHttpUrl {
    host: String,
    port: u16,
    path: String,
}

fn parse_http_url(url: &str) -> Result<ParsedHttpUrl> {
    let rest = url
        .strip_prefix("http://")
        .ok_or("devctl health currently supports http:// URLs only")?;
    let (host_port, path) = rest.split_once('/').unwrap_or((rest, ""));
    let (host, port) = match host_port.split_once(':') {
        Some((host, port)) => (host.to_string(), port.parse::<u16>()?),
        None => (host_port.to_string(), 80),
    };
    Ok(ParsedHttpUrl {
        host,
        port,
        path: format!("/{path}"),
    })
}
