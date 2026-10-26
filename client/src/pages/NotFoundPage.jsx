import { Link as RouterLink } from "react-router-dom";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import CompassCalibrationIcon from "@mui/icons-material/CompassCalibration";

export default function NotFoundPage() {
  return (
    <Box sx={{ minHeight: "60vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", p: 4 }}>
      <CompassCalibrationIcon sx={{ fontSize: 56, color: "#12a5a0" }} />
      <Typography variant="h4" sx={{ mt: 2 }}>404 — this page is off the forecast</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mt: 1, maxWidth: 420 }}>
        The route you followed doesn't exist. Cash is safe; the URL isn't.
      </Typography>
      <Button component={RouterLink} to="/dashboard" variant="contained" sx={{ mt: 3 }}>Back to Overview</Button>
    </Box>
  );
}
