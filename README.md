# Three.js URDF Robot Control Panel

A browser-based multi-robot control panel with native Three.js rendering, URDF loading,
per-instance MQTT motion streams, virtual joysticks, and MQTT-configured policies.

## Run Locally

**Prerequisite:** Node.js 20+

1. Install dependencies:
   `npm install`
2. Copy `.env.example` to `.env` and set `VITE_MQTT_BROKER_URL` to your MQTT
   broker's WebSocket endpoint, for example `ws://localhost:9001` or
   `wss://broker.example.com/mqtt`.
3. Start the local model backend in one terminal:
   `npm run backend`
4. Run the app in another terminal:
   `npm run dev`

During development, Vite proxies `/api` and `/assets` to `PANEL_BACKEND_URL`
(default: `http://localhost:5000`). The backend scans `assets/models` and serves the
URDF files and their referenced meshes directly from this project.

For production, build and launch the same backend as the application server:

```bash
npm run build
npm start
```

It serves the compiled `dist` frontend, `/api/models`, `/api/terrains`, and `/assets`
from one process.
`ROBOT_ASSETS_DIR`, `FRONTEND_DIST_DIR`, `HOST`, and `PORT` may be used to override
their defaults.

The app connects directly to the configured broker. Because it runs in a browser, the
broker must expose MQTT over WebSocket (`ws://` or `wss://`); a raw `mqtt://` TCP endpoint
cannot be used directly.

## Policy configuration

The app subscribes to `robot/policies`. Every valid message replaces the available policy
list and must be a direct JSON array:

```json
[
  {
    "name": "locomotion",
    "type": "lower_body",
    "inputs": ["vx", "vy", "yaw", "height"]
  },
  {
    "name": "arm_control",
    "type": "upper_body",
    "inputs": ["pitch"]
  }
]
```

`type` is `full_body`, `lower_body`, or `upper_body`; `inputs` is a subset of `vx`, `vy`,
`yaw`, `pitch`, and `height`. One lower-body and one upper-body policy may run together.
A full-body policy is mutually exclusive with both. The `robot/commands` payload contains
the active names in `control.policy`; inputs not accepted by the active policies are sent
as zero.

## Add robots to the scene

The scene starts empty. Select **ADD URDF** to open the bundled model library.
Search by filename, filter by model tag, select a URDF, and add it to the scene. The list
comes from `/api/models`; the selected URDF and its meshes load from `/assets`.

Selecting a model fills the modal's MQTT motion topic input with that model's default topic.
You can edit it before adding the model, and it remains editable in the scene robot list.
The same URDF can be added more than once, and instances may intentionally share one topic.
An optional fallback motion topic may also be supplied while adding the URDF. It uses the
same message schema as the primary topic. The latest fallback `base_xyz` replaces the
primary position only when all three primary coordinates are exactly zero; every other
motion field continues to come from the primary topic.
When **FORCE FALLBACK BASE POSE** is selected, the latest fallback `base_xyz` and
`base_quat_wxyz` always replace both primary base-pose fields, even when the primary
position is nonzero. Joint values and all other fields still come from the primary topic.
The add-URDF modal provides the original appearance plus translucent red, green, blue,
and purple presets. After a robot with a color preset loads, its matching transformation
GIF plays in the lower-left corner while the robot materials change color in sequence.
The preset cannot be changed or inspected from the scene robot list afterward.

## Add terrain to the scene

Use **LOAD TERRAIN** on the right side of the viewport to select an OBJ file from the
bundled terrain library. Loading another terrain replaces and disposes the previous one.
The terrain list comes from `/api/terrains`, and the OBJ loads from `/assets`.
Use **CLEAR TERRAIN** in the same modal to cancel a pending terrain load and remove the
active terrain without affecting loaded robots.

## G1 MuJoCo motion stream

G1 models default to the topic `robot/g1/mujoco/state`, matching the example used by
`../sim/g1_mujoco_sim`. Start the simulator with MQTT publishing enabled:

```bash
cd ../sim
uv run g1-run-sim \
  --mqtt-broker mqtt://localhost:1883 \
  --mqtt-topic robot/g1/mujoco/state \
  --mqtt-frequency 50
```

The simulator uses raw MQTT while the browser uses MQTT over WebSocket, so both endpoints
must belong to the same broker. Messages follow the fields emitted by
`g1_mujoco_sim/mqtt.py` exactly:

```json
{
  "timestamp": 1750000000.123,
  "simulation_time": 1.25,
  "joint_names": ["left_hip_pitch_joint", "left_knee_joint"],
  "joint_values": [-0.312, 0.669],
  "base_xyz": [0.0, 0.0, 0.82],
  "base_quat_wxyz": [1.0, 0.0, 0.0, 0.0]
}
```

`joint_names` and `joint_values` are paired by index. Joint values are radians, base
coordinates use MuJoCo's Z-up convention, and the base quaternion keeps MuJoCo's
`[w, x, y, z]` order. Unknown and fixed joints are ignored with a warning. Malformed arrays,
non-finite numbers, and zero quaternions reject the whole frame.

The viewport applies the newest valid frame immediately without interpolation or history.
Editing an instance topic switches its MQTT subscription immediately; removing an instance
also removes its subscription.

## Send external forces to MuJoCo

Open **外力控制** in the header to edit and send a batch of forces. The compact
non-modal panel starts in the bottom-right corner: drag its title bar to reposition
it, or collapse it to just the title bar. The main viewport remains interactive.
Select a force chip to edit that row; all rows are still sent together. Topic and
JSON are under **发送设置与 JSON**. This tool uses
the panel's existing browser MQTT connection and requires no model backend or loaded
URDF. Start the simulator with a force subscription on the same broker:

```bash
cd ../sim
uv run g1-run-sim \
  --mqtt-broker mqtt://localhost:1883 \
  --mqtt-force-topic robot/g1/mujoco/force
```

Optionally append `--mqtt-topic robot/g1/mujoco/state --mqtt-frequency 50` for motion
visualization. The browser defaults to `ws://localhost:9001`; configure
`VITE_MQTT_BROKER_URL` for another broker's WebSocket endpoint. HTTPS pages require a
`wss://` endpoint. Both ports must connect to the same broker.

Each force specifies a MuJoCo body name (for example `torso_link` or `pelvis`), a
nonzero world-coordinate XYZ direction, magnitude in newtons, and duration in
**simulation seconds**. The simulator normalizes directions and applies forces at
body centers of mass. Body names are checked by the simulator, not inferred from
the panel's URDF scene.

Add or remove rows, use the six axis shortcuts, or type arbitrary XYZ directions.
The Z-up preview shows equal-length colored arrows at a shared origin, independent
of force magnitude and robot pose. Selecting a row or legend highlights its arrow;
drag to orbit, scroll/pinch to zoom, or reset the view. Invalid direction drafts are
omitted from the preview. Closing or collapsing the panel preserves drafts until page reload.

**整批发送** publishes one `{"forces":[{"body_name":"torso_link","direction":[1,0,0],
"magnitude":50,"duration":0.5}]}` message to the editable topic, using QoS 0 and
`retain: false`. All rows must be valid. Sending is disabled while disconnected,
while a send is pending, or while panel emergency stop is active. The MQTT inspector
records successful outgoing batches. “已发送” means sent by the client, not confirmed
execution by the simulator; there is no execution acknowledgement in this protocol.

Repeated sends **add** forces, including forces on the same body. Removing a row,
closing the dialog, or engaging the panel emergency stop does not cancel an already
sent force. Forces expire on simulation time, so pausing simulation also pauses their
duration. The shared MQTT connection disables offline QoS 0 queuing; reconnecting
never automatically resends a force. Send again manually only when intended.

## Verification

```bash
npm test
npm run lint
npm run build
```
