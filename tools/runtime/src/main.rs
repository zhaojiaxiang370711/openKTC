use std::{
    io::{self, BufRead, Write},
    process::ExitCode,
    time::{SystemTime, UNIX_EPOCH},
};

use serde::{Deserialize, Serialize};
use serde_json::{Value, json};

type Result<T> = std::result::Result<T, Box<dyn std::error::Error>>;

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
    position: f64,
    volume: u8,
    muted: bool,
    fullscreen: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    current_plan_id: Option<String>,
    updated_at: String,
}

#[derive(Debug, Clone, Copy, Serialize)]
#[serde(rename_all = "camelCase")]
enum RuntimeStatus {
    Idle,
    Ready,
    Loading,
    Playing,
    Paused,
}

#[derive(Debug)]
struct RuntimeState {
    status: RuntimeStatus,
    position: f64,
    volume: u8,
    muted: bool,
    fullscreen: bool,
    current_plan_id: Option<String>,
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
    let mut state = RuntimeState::default();
    emit(RuntimeEvent::ready(state.snapshot()))?;

    let stdin = io::stdin();
    for line in stdin.lock().lines() {
        let line = line?;
        if line.trim().is_empty() {
            continue;
        }

        match serde_json::from_str::<RuntimeCommand>(&line) {
            Ok(command) => handle_command(&mut state, command)?,
            Err(err) => emit(RuntimeEvent::command_failed(
                None,
                "invalidJson",
                &err.to_string(),
            ))?,
        }
    }

    Ok(())
}

fn handle_command(state: &mut RuntimeState, command: RuntimeCommand) -> Result<()> {
    let request_id = command.request_id;
    let result = apply_command(state, &command.kind, command.payload);
    match result {
        Ok(payload) => emit(RuntimeEvent::command_ack(request_id, payload)),
        Err(err) => emit(RuntimeEvent::command_failed(
            Some(request_id),
            "commandFailed",
            &err,
        )),
    }?;
    emit(RuntimeEvent::state_changed(state.snapshot()))?;
    Ok(())
}

fn apply_command(
    state: &mut RuntimeState,
    kind: &str,
    payload: Value,
) -> std::result::Result<Value, String> {
    match kind {
        "ping" => {}
        "restart" => {
            *state = RuntimeState::default();
            state.status = RuntimeStatus::Ready;
        }
        "loadPlan" => {
            state.status = RuntimeStatus::Loading;
            state.position = 0.0;
            state.current_plan_id = payload
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
        "play" => state.status = RuntimeStatus::Playing,
        "pause" => state.status = RuntimeStatus::Paused,
        "stop" | "next" | "previous" => {
            state.status = RuntimeStatus::Idle;
            state.position = 0.0;
            state.current_plan_id = None;
        }
        "seek" => {
            state.position = payload
                .get("position")
                .or_else(|| payload.get("seconds"))
                .and_then(Value::as_f64)
                .unwrap_or(state.position)
                .max(0.0);
        }
        "setVolume" => {
            state.volume = payload
                .get("volume")
                .and_then(Value::as_u64)
                .unwrap_or(state.volume as u64)
                .min(100) as u8;
        }
        "setSubs" => {}
        "setPitch" => {}
        "setSpeed" => {}
        "toggleFullscreen" => state.fullscreen = !state.fullscreen,
        other => return Err(format!("unsupported playback command: {other}")),
    }

    Ok(json!({
        "kind": kind,
        "snapshot": state.snapshot(),
    }))
}

impl Default for RuntimeState {
    fn default() -> Self {
        Self {
            status: RuntimeStatus::Ready,
            position: 0.0,
            volume: 100,
            muted: false,
            fullscreen: false,
            current_plan_id: None,
        }
    }
}

impl RuntimeState {
    fn snapshot(&self) -> RuntimeSnapshot {
        RuntimeSnapshot {
            status: self.status,
            position: self.position,
            volume: self.volume,
            muted: self.muted,
            fullscreen: self.fullscreen,
            current_plan_id: self.current_plan_id.clone(),
            updated_at: now(),
        }
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
