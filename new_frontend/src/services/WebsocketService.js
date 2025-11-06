// src/services/WebsocketService.js
// Usa VITE_WS_URL si existe; si no, fallback a ws://localhost:8000
// const WS_BASE = import.meta.env.VITE_WS_URL || (location.protocol === "https:" ? "wss://localhost:8000" : "ws://localhost:8000");

// export function connectWS(processId, token, onMessage, onOpen, onClose) {
//   // token debe ser solo el access token (no "Bearer " repetido)
//   const bearer = token.startsWith("Bearer ") ? token : `Bearer ${token}`;
//   const url = `${WS_BASE}/procesos/ws/${processId}?token=${encodeURIComponent(bearer)}`;

//   let ws;
//   try {
//     ws = new WebSocket(url);
//   } catch (err) {
//     console.error("WS: fallo creación WebSocket (URL):", url, err);
//     return null;
//   }

//   ws.onopen = (ev) => {
//     console.log("WS conectado a:", url);
//     onOpen && onOpen(ev);
//   };

//   ws.onmessage = (ev) => {
//     try {
//       const data = JSON.parse(ev.data);
//       onMessage && onMessage(data);
//     } catch (err) {
//       console.error("WS: error parseando mensaje:", ev.data, err);
//     }
//   };

//   ws.onclose = (ev) => {
//     console.log("WS cerrado:", ev.code, ev.reason);
//     onClose && onClose(ev);
//   };

//   ws.onerror = (err) => {
//     // no prints masivas; mostrar resumen
//     console.error("WS error (ver consola de red si es problema de handshake):", err);
//   };

//   return ws;
// }
