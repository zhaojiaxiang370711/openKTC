use std::{
    env, fs,
    io::{self, BufRead, BufReader, Write},
    os::unix::net::UnixStream,
    path::{Path, PathBuf},
    process::{Child, Command, ExitCode, Stdio},
    thread::sleep,
    time::{Duration, SystemTime, UNIX_EPOCH},
};

use serde::{Deserialize, Serialize};
use serde_json::{Value, json};

type Result<T> = std::result::Result<T, Box<dyn std::error::Error>>;

#[derive(Debug)]
struct RuntimeOptions {
    backend: RuntimeBackend,
    mpv_socket_path: PathBuf,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
enum RuntimeBackend {
    DryRun,
    Mpv,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct RuntimeCommand {
    request_id: String,
    kind: String,
    #[serde(default)]
    payload: Value,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct RuntimeEvent {
    #[serde(rename = "type")]
    event_type: &'static str,
    created_at: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    request_id: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    payload: Option<Value>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct RuntimeSnapshot {
    status: RuntimeStatus,
    backend: RuntimeBackend,
    position: f64,
    volume: u8,
    muted: bool,
    fullscreen: bool,
    mpv_alive: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    current_plan_id: Option<String>,
    updated_at: String,
}

#[derive(Debug, Clone, Copy, Serialize)]
#[serde(rename_all = "camelCase")]
enum RuntimeStatus {
    Idle,
    Starting,
    Ready,
    Loading,
    Playing,
    Paused,
    Recovering,
    Failed,
}

#[derive(Debug)]
struct RuntimeState {
    status: RuntimeStatus,
    backend: RuntimeBackend,
    position: f64,
    volume: u8,
    muted: bool,
    fullscreen: bool,
    current_plan_id: Option<String>,
    mpv_alive: bool,
}

struct Runtime {
    state: RuntimeState,
    mpv: Option<MpvSupervisor>,
}

struct MpvSupervisor {
    child: Child,
    socket_path: PathBuf,
    request_id: i64,
}

fn main() -> ExitCode {
    match run() {
        Ok(()) => ExitCode::SUCCESS,
        Err(err) => {
            eprintln!("{err}");
            ExitCode::FAILURE
        }
    }
}

fn run() -> Result<()> {
    let options = RuntimeOptions::from_env_and_args()?;
    let mut runtime = Runtime::start(options)?;
    emit(RuntimeEvent::ready(runtime.state.snapshot()))?;

    let stdin = io::stdin();
    for line in stdin.lock().lines() {
        let line = line?;
        if line.trim().is_empty() {
            continue;
        }

        runtime.observe_mpv_exit()?;
        match serde_json::from_str::<RuntimeCommand>(&line) {
            Ok(command) => runtime.handle_command(command)?,
            Err(err) => emit(RuntimeEvent::command_failed(
                None,
                "invalidJson",
                &err.to_string(),
            ))?,
        }
    }

    runtime.shutdown();
    Ok(())
}

impl RuntimeOptions {
    fn from_env_and_args() -> Result<Self> {
        let mut backend = match env::var("OPENKTV_RUNTIME_BACKEND").ok().as_deref() {
            Some("mpv") => RuntimeBackend::Mpv,
            _ => RuntimeBackend::DryRun,
        };

        for arg in env::args().skip(1) {
            match arg.as_str() {
                "--mpv" => backend = RuntimeBackend::Mpv,
                "--dry-run" => backend = RuntimeBackend::DryRun,
                "--help" | "-h" => {
                    println!(
                        "openktv-runtime\n\nUsage:\n  openktv-runtime [--dry-run|--mpv]\n\nJSONL commands are read from stdin and events are emitted on stdout."
                    );
                    std::process::exit(0);
                }
                other => return Err(format!("unknown runtime option: {other}").into()),
            }
        }

        let mpv_socket_path = env::var("OPENKTV_RUNTIME_MPV_SOCKET")
            .map(PathBuf::from)
            .unwrap_or_else(|_| {
                env::temp_dir().join(format!("openktv-runtime-{}.sock", std::process::id()))
            });

        Ok(Self {
            backend,
            mpv_socket_path,
        })
    }
}

impl Runtime {
    fn start(options: RuntimeOptions) -> Result<Self> {
        let mut state = RuntimeState::new(options.backend);
        let mpv = if options.backend == RuntimeBackend::Mpv {
            state.status = RuntimeStatus::Starting;
            let supervisor = MpvSupervisor::start(options.mpv_socket_path)?;
            state.status = RuntimeStatus::Ready;
            state.mpv_alive = true;
            Some(supervisor)
        } else {
            state.status = RuntimeStatus::Ready;
            None
        };

        Ok(Self { state, mpv })
    }

    fn handle_command(&mut self, command: RuntimeCommand) -> Result<()> {
        let request_id = command.request_id;
        let result = self.apply_command(&command.kind, command.payload);
        match result {
            Ok(payload) => emit(RuntimeEvent::command_ack(request_id, payload)),
            Err(err) => {
                self.state.status = RuntimeStatus::Failed;
                emit(RuntimeEvent::command_failed(
                    Some(request_id),
                    "commandFailed",
                    &err,
                ))
            }
        }?;
        emit(RuntimeEvent::state_changed(self.state.snapshot()))?;
        Ok(())
    }

    fn apply_command(&mut self, kind: &str, payload: Value) -> std::result::Result<Value, String> {
        if kind == "ping" {
            return Ok(self.command_payload(kind, None));
        }

        let mpv_response = if self.state.backend == RuntimeBackend::Mpv {
            self.apply_mpv_command(kind, &payload)?
        } else {
            None
        };

        self.apply_state_command(kind, payload)?;
        Ok(self.command_payload(kind, mpv_response))
    }

    fn apply_mpv_command(
        &mut self,
        kind: &str,
        payload: &Value,
    ) -> std::result::Result<Option<Value>, String> {
        if kind == "restart" {
            let socket_path = self
                .mpv
                .as_ref()
                .map(|mpv| mpv.socket_path.clone())
                .unwrap_or_else(|| {
                    env::temp_dir().join(format!("openktv-runtime-{}.sock", std::process::id()))
                });
            self.state.status = RuntimeStatus::Recovering;
            self.mpv = Some(MpvSupervisor::start(socket_path)?);
            self.state.mpv_alive = true;
            return Ok(None);
        }

        let mpv = self.mpv.as_mut().ok_or("mpv supervisor is not running")?;
        if let Some(exit) = mpv.try_wait().map_err(|err| err.to_string())? {
            self.state.status = RuntimeStatus::Recovering;
            self.state.mpv_alive = false;
            emit(RuntimeEvent::runtime_crashed(&format!(
                "mpv exited with status {exit}"
            )))
            .map_err(|err| err.to_string())?;
            return Err(format!("mpv exited with status {exit}"));
        }

        let mut response = None;
        match kind {
            "loadPlan" => {
                let media_path = payload
                    .get("mediaPath")
                    .and_then(Value::as_str)
                    .or_else(|| {
                        payload
                            .get("plan")
                            .and_then(|plan| plan.get("mediaPath"))
                            .and_then(Value::as_str)
                    })
                    .ok_or("loadPlan requires mediaPath")?;
                let mut command = vec![
                    json!("loadfile"),
                    json!(media_path),
                    json!("replace"),
                    json!("0"),
                    normalize_mpv_options(payload.get("mpvOptions")),
                ];
                if let Some(subtitle_path) = payload.get("subtitlePath").and_then(Value::as_str) {
                    let options = command.last_mut().expect("loadfile options exists");
                    if let Some(map) = options.as_object_mut() {
                        map.insert("sub-file".to_string(), json!(subtitle_path));
                        map.insert("sid".to_string(), json!("1"));
                    }
                }
                response = Some(mpv.ipc_command(Value::Array(std::mem::take(&mut command)))?);
            }
            "play" => {
                response = Some(mpv.ipc_command(json!(["set_property", "pause", false]))?);
            }
            "pause" => {
                response = Some(mpv.ipc_command(json!(["set_property", "pause", true]))?);
            }
            "stop" | "next" | "previous" => {
                response = Some(mpv.ipc_command(json!(["stop"]))?);
            }
            "seek" => {
                let position = payload
                    .get("position")
                    .or_else(|| payload.get("seconds"))
                    .and_then(Value::as_f64)
                    .unwrap_or(0.0)
                    .max(0.0);
                response = Some(mpv.ipc_command(json!(["set_property", "time-pos", position]))?);
            }
            "setVolume" => {
                let volume = payload
                    .get("volume")
                    .and_then(Value::as_u64)
                    .unwrap_or(self.state.volume as u64)
                    .min(100);
                response = Some(mpv.ipc_command(json!(["set_property", "volume", volume]))?);
            }
            "setSpeed" => {
                let speed = payload.get("speed").and_then(Value::as_f64).unwrap_or(1.0);
                response = Some(mpv.ipc_command(json!(["set_property", "speed", speed]))?);
            }
            "setSubs" => {
                let visible = payload
                    .get("visible")
                    .or_else(|| payload.get("enabled"))
                    .and_then(Value::as_bool)
                    .unwrap_or(true);
                response =
                    Some(mpv.ipc_command(json!(["set_property", "sub-visibility", visible]))?);
            }
            "toggleFullscreen" => {
                response = Some(mpv.ipc_command(json!(["cycle", "fullscreen"]))?);
            }
            "setPitch" => {}
            other => return Err(format!("unsupported playback command: {other}")),
        }

        Ok(response)
    }

    fn apply_state_command(
        &mut self,
        kind: &str,
        payload: Value,
    ) -> std::result::Result<(), String> {
        match kind {
            "restart" => {
                self.state.status = RuntimeStatus::Ready;
                self.state.position = 0.0;
                self.state.current_plan_id = None;
            }
            "loadPlan" => {
                self.state.status = RuntimeStatus::Loading;
                self.state.position = 0.0;
                self.state.current_plan_id = payload
                    .get("id")
                    .and_then(Value::as_str)
                    .or_else(|| {
                        payload
                            .get("plan")
                            .and_then(|plan| plan.get("id"))
                            .and_then(Value::as_str)
                    })
                    .map(ToOwned::to_owned);
            }
            "play" => self.state.status = RuntimeStatus::Playing,
            "pause" => self.state.status = RuntimeStatus::Paused,
            "stop" | "next" | "previous" => {
                self.state.status = RuntimeStatus::Idle;
                self.state.position = 0.0;
                self.state.current_plan_id = None;
            }
            "seek" => {
                self.state.position = payload
                    .get("position")
                    .or_else(|| payload.get("seconds"))
                    .and_then(Value::as_f64)
                    .unwrap_or(self.state.position)
                    .max(0.0);
            }
            "setVolume" => {
                self.state.volume = payload
                    .get("volume")
                    .and_then(Value::as_u64)
                    .unwrap_or(self.state.volume as u64)
                    .min(100) as u8;
            }
            "setSubs" => {}
            "setPitch" => {}
            "setSpeed" => {}
            "toggleFullscreen" => self.state.fullscreen = !self.state.fullscreen,
            other => return Err(format!("unsupported playback command: {other}")),
        }

        Ok(())
    }

    fn observe_mpv_exit(&mut self) -> Result<()> {
        let Some(mpv) = self.mpv.as_mut() else {
            return Ok(());
        };

        if let Some(exit) = mpv.try_wait()? {
            self.state.status = RuntimeStatus::Recovering;
            self.state.mpv_alive = false;
            emit(RuntimeEvent::runtime_crashed(&format!(
                "mpv exited with status {exit}"
            )))?;
            emit(RuntimeEvent::state_changed(self.state.snapshot()))?;
        }

        Ok(())
    }

    fn command_payload(&self, kind: &str, mpv_response: Option<Value>) -> Value {
        json!({
            "kind": kind,
            "backend": self.state.backend,
            "snapshot": self.state.snapshot(),
            "mpvResponse": mpv_response,
        })
    }

    fn shutdown(&mut self) {
        if let Some(mpv) = self.mpv.as_mut() {
            mpv.shutdown();
        }
    }
}

impl RuntimeState {
    fn new(backend: RuntimeBackend) -> Self {
        Self {
            status: RuntimeStatus::Ready,
            backend,
            position: 0.0,
            volume: 100,
            muted: false,
            fullscreen: false,
            current_plan_id: None,
            mpv_alive: backend == RuntimeBackend::DryRun,
        }
    }

    fn snapshot(&self) -> RuntimeSnapshot {
        RuntimeSnapshot {
            status: self.status,
            backend: self.backend,
            position: self.position,
            volume: self.volume,
            muted: self.muted,
            fullscreen: self.fullscreen,
            mpv_alive: self.mpv_alive,
            current_plan_id: self.current_plan_id.clone(),
            updated_at: now(),
        }
    }
}

impl MpvSupervisor {
    fn start(socket_path: PathBuf) -> std::result::Result<Self, String> {
        remove_socket_if_exists(&socket_path).map_err(|err| err.to_string())?;

        let mut command =
            Command::new(env::var("OPENKTV_MPV_BIN").unwrap_or_else(|_| "mpv".to_string()));
        command
            .arg("--idle=yes")
            .arg("--force-window=no")
            .arg("--no-terminal")
            .arg("--msg-level=all=warn")
            .arg(format!("--input-ipc-server={}", socket_path.display()))
            .stdin(Stdio::null())
            .stdout(Stdio::null())
            .stderr(Stdio::null());

        for arg in extra_mpv_args() {
            command.arg(arg);
        }

        let mut child = command
            .spawn()
            .map_err(|err| format!("failed to start mpv: {err}"))?;
        wait_for_socket(&socket_path, &mut child)?;

        Ok(Self {
            child,
            socket_path,
            request_id: 0,
        })
    }

    fn ipc_command(&mut self, command: Value) -> std::result::Result<Value, String> {
        self.request_id += 1;
        let request_id = self.request_id;
        let request = json!({
            "command": command,
            "request_id": request_id,
        });

        let mut stream = UnixStream::connect(&self.socket_path)
            .map_err(|err| format!("failed to connect mpv IPC: {err}"))?;
        serde_json::to_writer(&mut stream, &request).map_err(|err| err.to_string())?;
        stream.write_all(b"\n").map_err(|err| err.to_string())?;
        stream.flush().map_err(|err| err.to_string())?;

        let mut response = String::new();
        BufReader::new(stream)
            .read_line(&mut response)
            .map_err(|err| err.to_string())?;
        let value: Value = serde_json::from_str(&response).map_err(|err| err.to_string())?;
        let error = value
            .get("error")
            .and_then(Value::as_str)
            .unwrap_or("unknown");
        if error != "success" {
            return Err(format!("mpv IPC command failed: {error}"));
        }
        Ok(value)
    }

    fn try_wait(&mut self) -> io::Result<Option<std::process::ExitStatus>> {
        self.child.try_wait()
    }

    fn shutdown(&mut self) {
        let _ = self.ipc_command(json!(["quit"]));
        for _ in 0..10 {
            match self.child.try_wait() {
                Ok(Some(_)) => break,
                Ok(None) => sleep(Duration::from_millis(50)),
                Err(_) => break,
            }
        }
        let _ = self.child.kill();
        let _ = fs::remove_file(&self.socket_path);
    }
}

impl RuntimeEvent {
    fn ready(snapshot: RuntimeSnapshot) -> Self {
        Self {
            event_type: "runtimeReady",
            created_at: now(),
            request_id: None,
            payload: Some(json!({ "snapshot": snapshot })),
        }
    }

    fn state_changed(snapshot: RuntimeSnapshot) -> Self {
        Self {
            event_type: "stateChanged",
            created_at: now(),
            request_id: None,
            payload: Some(json!({ "snapshot": snapshot })),
        }
    }

    fn command_ack(request_id: String, payload: Value) -> Self {
        Self {
            event_type: "commandAck",
            created_at: now(),
            request_id: Some(request_id),
            payload: Some(payload),
        }
    }

    fn command_failed(request_id: Option<String>, code: &'static str, message: &str) -> Self {
        Self {
            event_type: "commandFailed",
            created_at: now(),
            request_id,
            payload: Some(json!({
                "error": {
                    "code": code,
                    "message": message,
                }
            })),
        }
    }

    fn runtime_crashed(message: &str) -> Self {
        Self {
            event_type: "runtimeCrashed",
            created_at: now(),
            request_id: None,
            payload: Some(json!({
                "error": {
                    "code": "mpvExited",
                    "message": message,
                }
            })),
        }
    }
}

fn extra_mpv_args() -> Vec<String> {
    env::var("OPENKTV_RUNTIME_MPV_ARGS")
        .ok()
        .map(|args| args.split_whitespace().map(ToOwned::to_owned).collect())
        .unwrap_or_default()
}

fn normalize_mpv_options(options: Option<&Value>) -> Value {
    match options {
        Some(Value::Object(map)) => Value::Object(map.clone()),
        _ => json!({}),
    }
}

fn wait_for_socket(path: &Path, child: &mut Child) -> std::result::Result<(), String> {
    for _ in 0..50 {
        if path.exists() {
            return Ok(());
        }
        if let Some(exit) = child.try_wait().map_err(|err| err.to_string())? {
            return Err(format!("mpv exited before creating IPC socket: {exit}"));
        }
        sleep(Duration::from_millis(100));
    }
    Err(format!(
        "mpv IPC socket did not appear at {}",
        path.display()
    ))
}

fn remove_socket_if_exists(path: &Path) -> io::Result<()> {
    match fs::remove_file(path) {
        Ok(()) => Ok(()),
        Err(err) if err.kind() == io::ErrorKind::NotFound => Ok(()),
        Err(err) => Err(err),
    }
}

fn emit(event: RuntimeEvent) -> Result<()> {
    let mut stdout = io::stdout().lock();
    serde_json::to_writer(&mut stdout, &event)?;
    stdout.write_all(b"\n")?;
    stdout.flush()?;
    Ok(())
}

fn now() -> String {
    let millis = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis();
    millis.to_string()
}
