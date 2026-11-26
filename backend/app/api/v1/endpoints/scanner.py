import json
import logging
import os
import socket
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from app.core.websocket import scanner_ws_manager

logger = logging.getLogger("partshop.scanner")
router = APIRouter(prefix="/scanner", tags=["Mobile Barcode Scanner Gateway"])


def is_docker_or_loopback_ip(ip: str) -> bool:
    """Checks if an IP address belongs to Docker bridge subnets (172.16-31.x.x) or loopback."""
    if not ip or ip.startswith("127.") or ip == "localhost":
        return True
    parts = ip.split(".")
    if len(parts) == 4 and parts[0] == "172":
        try:
            second_octet = int(parts[1])
            if 16 <= second_octet <= 31:
                return True
        except ValueError:
            pass
    return False


def get_lan_ip() -> str:
    """Detect the host machine's primary local area network (LAN) IP address."""
    # 1. Prioritize explicitly configured environment variable (e.g. in Docker setups)
    env_ip = os.environ.get("HOST_LAN_IP") or os.environ.get("HOST_IP")
    if env_ip and env_ip.strip():
        return env_ip.strip()

    # 2. Socket routing check
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
    except Exception:
        ip = "127.0.0.1"
    finally:
        s.close()
    return ip


@router.get("/network-info")
def get_network_info():
    """
    Returns local network IP addresses for generating mobile pairing QR codes.
    Filters out internal Docker bridge subnets (172.16-31.x.x) so phones are directed to valid LAN addresses.
    """
    configured_host_ip = os.environ.get("HOST_LAN_IP") or os.environ.get("HOST_IP")
    detected_lan_ip = get_lan_ip()

    # Prioritize explicit environment config, then valid non-docker detected LAN IP
    if configured_host_ip and configured_host_ip.strip():
        primary_ip = configured_host_ip.strip()
    elif not is_docker_or_loopback_ip(detected_lan_ip):
        primary_ip = detected_lan_ip
    else:
        primary_ip = "192.168.1.9"

    hostname = socket.gethostname()
    all_ips = []
    if primary_ip and not is_docker_or_loopback_ip(primary_ip):
        all_ips.append(primary_ip)

    try:
        _, _, ip_list = socket.gethostbyname_ex(hostname)
        for ip in ip_list:
            # Strictly exclude internal Docker bridge subnets and loopback addresses
            if not is_docker_or_loopback_ip(ip) and ip not in all_ips:
                all_ips.append(ip)
    except Exception:
        pass

    if not all_ips:
        all_ips.append("192.168.1.9")

    if is_docker_or_loopback_ip(primary_ip):
        primary_ip = "192.168.1.9"

    is_docker = False

    return {
        "primary_ip": primary_ip,
        "all_ips": all_ips,
        "is_docker_container_ip": is_docker,
        "frontend_port": 3000,
        "backend_port": 8001,
        "suggested_scan_url": f"http://{primary_ip}:3000/scan",
    }


@router.websocket("/ws/{session_id}")
async def scanner_websocket(websocket: WebSocket, session_id: str):
    """
    Bidirectional WebSocket bridge between desktop terminal and mobile phone scanner(s).
    Supports multiple mobile scanners simultaneously, maintains a live device roster,
    and relays BARCODE_SCANNED, DEVICE_CONNECTED, and DISCONNECT events in real-time.
    """
    await scanner_ws_manager.connect(session_id, websocket)

    try:
        while True:
            raw_data = await websocket.receive_text()
            try:
                data = json.loads(raw_data)
            except json.JSONDecodeError:
                data = {"type": "RAW_TEXT", "payload": raw_data}

            msg_type = data.get("type", "")

            # Ping-Pong Keep-Alive
            if msg_type == "PING":
                await websocket.send_text(json.dumps({"type": "PONG"}))
                continue

            # Mobile Device Registration
            if msg_type == "DEVICE_CONNECTED":
                scanner_ws_manager.register_device(session_id, websocket, data)
                # Broadcast updated roster to all clients in session
                roster = scanner_ws_manager.get_roster(session_id)
                await scanner_ws_manager.broadcast_to_session(
                    session_id,
                    {
                        "type": "ROSTER_UPDATED",
                        "devices": roster,
                        "new_device": data,
                        "session_id": session_id,
                    },
                )
                continue

            # Query Connected Roster
            if msg_type == "GET_ROSTER":
                roster = scanner_ws_manager.get_roster(session_id)
                await websocket.send_text(
                    json.dumps({
                        "type": "ROSTER_UPDATED",
                        "devices": roster,
                        "session_id": session_id,
                    })
                )
                continue

            # Barcode Scanned
            if msg_type == "BARCODE_SCANNED":
                scanner_ws_manager.increment_scan_count(
                    session_id, websocket=websocket, device_id=data.get("device_id")
                )
                # Forward to desktop terminal peers
                await scanner_ws_manager.broadcast_to_session(session_id, data, sender=websocket)
                # Also send updated roster with updated scan counts
                roster = scanner_ws_manager.get_roster(session_id)
                await scanner_ws_manager.broadcast_to_session(
                    session_id,
                    {"type": "ROSTER_UPDATED", "devices": roster, "session_id": session_id},
                )
                continue

            # Generic event broadcast
            await scanner_ws_manager.broadcast_to_session(session_id, data, sender=websocket)

    except WebSocketDisconnect:
        disconnected_meta = scanner_ws_manager.disconnect(session_id, websocket)
        roster = scanner_ws_manager.get_roster(session_id)
        # Notify remaining peers that a device disconnected and send remaining roster
        await scanner_ws_manager.broadcast_to_session(
            session_id,
            {
                "type": "DEVICE_DISCONNECTED",
                "device": disconnected_meta,
                "session_id": session_id,
            },
        )
        await scanner_ws_manager.broadcast_to_session(
            session_id,
            {"type": "ROSTER_UPDATED", "devices": roster, "session_id": session_id},
        )
    except Exception as e:
        logger.error(f"Error in scanner WebSocket for session {session_id}: {e}")
        scanner_ws_manager.disconnect(session_id, websocket)
