import json
import logging
import time
from collections import defaultdict
from fastapi import WebSocket

logger = logging.getLogger("partshop.websocket")


class ScannerConnectionManager:
    """Manages real-time WebSocket communication sessions between desktop counter terminals and mobile phone scanners."""

    def __init__(self):
        # Maps session_id -> dict of {WebSocket: device_metadata_dict}
        self.active_sessions: dict[str, dict[WebSocket, dict]] = defaultdict(dict)

    async def connect(self, session_id: str, websocket: WebSocket):
        await websocket.accept()
        self.active_sessions[session_id][websocket] = {
            "device_type": "unknown",
            "connected_at": int(time.time() * 1000),
            "scan_count": 0,
        }
        logger.info(
            f"WebSocket client connected to session {session_id}. Total in room: {len(self.active_sessions[session_id])}"
        )

    def register_device(self, session_id: str, websocket: WebSocket, metadata: dict):
        """Associates device information (device_id, device_name, device_type) with the socket."""
        if session_id in self.active_sessions and websocket in self.active_sessions[session_id]:
            self.active_sessions[session_id][websocket].update(metadata)
            logger.info(
                f"Registered device in session {session_id}: {metadata.get('device_name')} ({metadata.get('device_id')})"
            )

    def increment_scan_count(
        self, session_id: str, websocket: WebSocket | None = None, device_id: str | None = None
    ):
        """Increments the count of barcodes scanned by a device."""
        if session_id not in self.active_sessions:
            return
        for ws, meta in self.active_sessions[session_id].items():
            if (websocket and ws == websocket) or (device_id and meta.get("device_id") == device_id):
                meta["scan_count"] = meta.get("scan_count", 0) + 1
                break

    def get_roster(self, session_id: str) -> list[dict]:
        """Returns list of connected mobile devices in the room."""
        if session_id not in self.active_sessions:
            return []
        roster = []
        for meta in self.active_sessions[session_id].values():
            if meta.get("device_type") == "mobile":
                roster.append({
                    "device_id": meta.get("device_id", "unknown"),
                    "device_name": meta.get("device_name", "Mobile Phone"),
                    "connected_at": meta.get("connected_at", int(time.time() * 1000)),
                    "scan_count": meta.get("scan_count", 0),
                })
        return roster

    def disconnect(self, session_id: str, websocket: WebSocket) -> dict | None:
        disconnected_meta = None
        if session_id in self.active_sessions:
            if websocket in self.active_sessions[session_id]:
                disconnected_meta = self.active_sessions[session_id].pop(websocket)
            if not self.active_sessions[session_id]:
                del self.active_sessions[session_id]
        logger.info(f"WebSocket client disconnected from session {session_id}.")
        return disconnected_meta

    async def broadcast_to_session(
        self, session_id: str, message: dict, sender: WebSocket | None = None
    ):
        """Broadcast message to other clients in the same session room."""
        if session_id not in self.active_sessions:
            return

        payload = json.dumps(message)
        dead_sockets = []

        for ws in list(self.active_sessions[session_id].keys()):
            if sender is None or ws != sender:
                try:
                    await ws.send_text(payload)
                except Exception as e:
                    logger.warning(
                        f"Failed to send WS message to client in session {session_id}: {e}"
                    )
                    dead_sockets.append(ws)

        for dead in dead_sockets:
            self.disconnect(session_id, dead)


# Global singleton instance
scanner_ws_manager = ScannerConnectionManager()
