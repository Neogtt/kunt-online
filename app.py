import json, os, threading, queue, time
import streamlit as st
from websocket import WebSocketApp  # websocket-client paketinden

# --- Ayarlar ---
WS_BASE = os.environ.get("WS_URL", "ws://127.0.0.1:3001")  # Node WS sunucusu
DEFAULT_ROOM = "deneme"

# ——— Thread-safe message kuyruğu ———
if "msg_queue" not in st.session_state:
    st.session_state.msg_queue = queue.Queue()
if "ws" not in st.session_state:
    st.session_state.ws = None
if "connected" not in st.session_state:
    st.session_state.connected = False
if "state" not in st.session_state:
    st.session_state.state = None
if "seat" not in st.session_state:
    st.session_state.seat = 0
if "room" not in st.session_state:
    st.session_state.room = DEFAULT_ROOM

def on_open(ws):
    st.session_state.connected = True
    # start mesajını sıraya koy
    ws.send(json.dumps({ "t":"start" }))

def on_message(ws, message):
    try:
        msg = json.loads(message)
    except Exception:
        msg = {"t":"raw", "data": message}
    st.session_state.msg_queue.put(msg)

def on_error(ws, error):
    # Streamlit thread'inde yazdır
    st.session_state.msg_queue.put({"t":"client_error", "error": str(error)})

def on_close(ws, status_code, msg):
    st.session_state.connected = False
    st.session_state.msg_queue.put({"t":"closed", "code": status_code, "reason": str(msg)})

def ws_thread(url):
    ws = WebSocketApp(
        url,
        on_open=on_open,
        on_message=on_message,
        on_error=on_error,
        on_close=on_close,
    )
    st.session_state.ws = ws
    # run_forever bloklar; thread içinde çalıştığı için sorun yok
    ws.run_forever(ping_interval=20, ping_timeout=10)

def connect(room: str, seat: int):
    if st.session_state.connected:
        return
    url = f"{WS_BASE}/?room={room}&seat={seat}"
    thread = threading.Thread(target=ws_thread, args=(url,), daemon=True)
    thread.start()
    # küçük bekleme: hemen arkasından send yaparsak henüz open olmamış olabilir
    time.sleep(0.2)

def safe_send(payload: dict):
    ws = st.session_state.ws
    if ws is None:
        return
    try:
        ws.send(json.dumps(payload))
    except Exception as e:
        st.warning(f"Gönderilemedi: {e}")

# ——— UI ———
st.set_page_config(page_title="KÜNT Streamlit", page_icon="🃏", layout="centered")

st.title("🃏 KÜNT – Streamlit UI")
col1, col2, col3 = st.columns(3)
with col1:
    st.session_state.room = st.text_input("Oda", st.session_state.room)
with col2:
    st.session_state.seat = st.number_input("Seat (0–3)", min_value=0, max_value=3, value=int(st.session_state.seat))
with col3:
    if st.button("Bağlan", use_container_width=True):
        connect(st.session_state.room, int(st.session_state.seat))

st.caption(f"WS URL: `{WS_BASE}` • Bağlı: {st.session_state.connected}")

# Kuyruktan mesajları çek → state’i güncelle
while not st.session_state.msg_queue.empty():
    m = st.session_state.msg_queue.get_nowait()
    if m.get("t") in ("state", "round_end"):
        st.session_state.state = m["state"]
    elif m.get("t") == "error":
        st.error(f"Server error: {m.get('msg')}")
    elif m.get("t") == "client_error":
        st.error(f"Client error: {m.get('error')}")
    elif m.get("t") == "closed":
        st.warning(f"WS kapandı (code={m.get('code')}, reason={m.get('reason')})")

state = st.session_state.state
seat = int(st.session_state.seat)

def card_label(c):
    if not c: return "—"
    suits = {"H":"♥","D":"♦","C":"♣","S":"♠"}
    ranks = {1:"A",11:"J",12:"Q",13:"K"}
    return f"{suits.get(c['suit'],'?')}{ranks.get(c['rank'],c['rank'])}"

st.divider()

if state is None:
    st.info("Henüz durum yok. ‘Bağlan’a tıkla. (Server: `npm run dev`)")
else:
    colA, colB = st.columns(2)
    with colA:
        st.subheader("Masa")
        st.write("Alt Kart (Joker Belirleyici): **{}**".format(card_label(state["bottomCard"])))
        st.write("Yerdeki Kart: **{}**".format(card_label(state.get("discardTop"))))
        st.write(f"Sıra: Oyuncu {state.get('turnSeat',0)+1}")
        st.write(f"Faz: {state.get('phase','')}")
    with colB:
        st.subheader("Eylemler")
        st.button("Desteden Çek", on_click=lambda: safe_send({"t":"draw_stock"}), use_container_width=True)
        st.button("Yerden Al", on_click=lambda: safe_send({"t":"draw_discard"}), use_container_width=True)
        st.button("At (ilk kart)", on_click=lambda: (
            safe_send({"t":"discard", "card": st.session_state.state["players"][seat]["hand"][0]})
            if st.session_state.state["players"][seat]["hand"] else None
        ), use_container_width=True)

    st.subheader("Elin")
    hand = state["players"][seat]["hand"] if state and state.get("players") else []
    if hand:
        cols = st.columns(8)
        for i, c in enumerate(hand):
            with cols[i % 8]:
                st.button(card_label(c), key=f"card_{c['id']}", on_click=lambda cc=c: safe_send({"t":"discard","card": cc}))
    else:
        st.write("—")

st.caption("Not: Bu UI, Node WS sunucusuna bağlanır; oyun mantığı sunucudadır.")
