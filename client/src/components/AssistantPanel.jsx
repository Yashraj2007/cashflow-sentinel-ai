import { useRef, useState } from "react";
import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import Fab from "@mui/material/Fab";
import TextField from "@mui/material/TextField";
import IconButton from "@mui/material/IconButton";
import Typography from "@mui/material/Typography";
import Chip from "@mui/material/Chip";
import Tooltip from "@mui/material/Tooltip";
import CloseIcon from "@mui/icons-material/Close";
import SendIcon from "@mui/icons-material/Send";
import { Sparkles, Bot } from "lucide-react";
import { useApp } from "../context/AppContext.jsx";
import { answerAssistant, SUGGESTED_QUESTIONS } from "../services/assistantService.js";

const TAG_CLASS = { computed: "assistant-tag--computed", explanation: "assistant-tag--explanation", unknown: "assistant-tag--unknown" };
const TAG_LABEL = { computed: "Computed", explanation: "Explanation", unknown: "Not enough data" };

export default function AssistantPanel() {
  const { dataset, settings } = useApp();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([]);
  const scrollRef = useRef(null);

  const ask = (question) => {
    const q = String(question || "").trim();
    if (!q) return;
    const answer = answerAssistant(q, { dataset, settings });
    setMessages((prev) => [...prev, { role: "user", text: q }, { role: "assistant", ...answer }]);
    setInput("");
    requestAnimationFrame(() => {
      if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    });
  };

  return (
    <>
      <Tooltip title="Ask the assistant">
        <Fab
          color="primary"
          size="medium"
          onClick={() => setOpen((v) => !v)}
          aria-label="Open assistant"
          sx={{ position: "fixed", bottom: 24, right: 24, zIndex: 1250, boxShadow: "0 10px 28px rgba(14,124,120,0.4)" }}
        >
          {open ? <CloseIcon /> : <Sparkles size={20} />}
        </Fab>
      </Tooltip>

      {open && (
        <Paper
          elevation={6}
          sx={{
            position: "fixed", bottom: 88, right: 24, zIndex: 1250,
            width: { xs: "calc(100vw - 32px)", sm: 400 }, height: 540, maxWidth: "calc(100vw - 32px)",
            display: "flex", flexDirection: "column", overflow: "hidden",
            border: "1px solid #e3e8ee", borderRadius: 3,
          }}
        >
          <Box sx={{ px: 2, py: 1.5, background: "#12263a", color: "#fff", display: "flex", alignItems: "center", gap: 1.25 }}>
            <Box sx={{ width: 30, height: 30, borderRadius: 2, background: "rgba(18,165,160,0.25)", display: "grid", placeItems: "center" }}>
              <Bot size={17} color="#4fd1c5" />
            </Box>
            <Box sx={{ flex: 1 }}>
              <Typography sx={{ fontSize: 13.5, fontWeight: 700, fontFamily: '"Space Grotesk"' }}>Sentinel Assistant</Typography>
              <Typography sx={{ fontSize: 11.8, color: "rgba(233,240,234,0.6)" }}>Local demo · answers computed from your data only</Typography>
            </Box>
            <IconButton size="small" onClick={() => setOpen(false)} sx={{ color: "#fff" }} aria-label="Close assistant">
              <CloseIcon fontSize="small" />
            </IconButton>
          </Box>

          <Box ref={scrollRef} sx={{ flex: 1, overflowY: "auto", p: 2, display: "flex", flexDirection: "column", gap: 1.5, background: "#f7f9fb" }}>
            {messages.length === 0 && (
              <Box>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5, fontSize: 12.5 }}>
                  I read the live forecast, invoices and party profiles — I never invent numbers. Try one of these:
                </Typography>
                <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.75 }}>
                  {SUGGESTED_QUESTIONS.map((q) => (
                    <Chip key={q} label={q} size="small" clickable onClick={() => ask(q)} sx={{ fontSize: 11.5, height: "auto", py: 0.5, border: "1px solid #cbd5df" }} />
                  ))}
                </Box>
              </Box>
            )}
            {messages.map((m, i) => (
              <Box key={i} sx={{ display: "flex", flexDirection: "column", alignItems: m.role === "user" ? "flex-end" : "flex-start" }}>
                {m.role === "assistant" && (
                  <span className={`assistant-tag ${TAG_CLASS[m.kind]}`} style={{ marginBottom: 4 }}>{TAG_LABEL[m.kind]}</span>
                )}
                <Box
                  sx={{
                    maxWidth: "88%", px: 1.5, py: 1, borderRadius: 2, fontSize: 12.75, lineHeight: 1.55,
                    background: m.role === "user" ? "#0e7c78" : "#fff",
                    color: m.role === "user" ? "#fff" : "text.primary",
                    border: m.role === "user" ? "none" : "1px solid #e3e8ee",
                    boxShadow: m.role === "user" ? "none" : "0 1px 2px rgba(18,38,58,0.05)",
                  }}
                >
                  {m.text}
                </Box>
              </Box>
            ))}
          </Box>

          <Box sx={{ p: 1.5, borderTop: "1px solid #e3e8ee", background: "#fff" }}>
            <form
              onSubmit={(e) => { e.preventDefault(); ask(input); }}
              style={{ display: "flex", gap: 8 }}
            >
              <TextField
                size="small"
                fullWidth
                placeholder="Ask about cash, risk, invoices…"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                aria-label="Ask the assistant"
              />
              <IconButton type="submit" color="primary" disabled={!input.trim()} aria-label="Send question">
                <SendIcon fontSize="small" />
              </IconButton>
            </form>
            <Typography sx={{ fontSize: 11.8, color: "text.secondary", mt: 0.75, textAlign: "center" }}>
              Mock assistant — deterministic answers from demo data. No LLM connected.
            </Typography>
          </Box>
        </Paper>
      )}
    </>
  );
}
