import { Navigate, useLocation } from "react-router-dom";
import Box from "@mui/material/Box";
import CircularProgress from "@mui/material/CircularProgress";
import { useAuth } from "../../context/AuthContext.jsx";

/**
 * AuthGuard — protects routes that require Firebase sign-in + onboarding.
 *
 * Rules:
 *  - Loading (Firebase initializing)  → show spinner
 *  - Not signed in                    → redirect to /welcome
 *  - Signed in, not onboarded         → redirect to /onboarding
 *  - Signed in + onboarded            → render children normally
 */
export default function AuthGuard({ children }) {
  const { isAuthenticated, onboarded, loading } = useAuth();
  const location = useLocation();

  // While Firebase auth state is initializing, show a loading spinner
  if (loading) {
    return (
      <Box
        sx={{
          height: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          bgcolor: "#F0F4F2",
        }}
      >
        <CircularProgress sx={{ color: "#0F7A62" }} />
      </Box>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/welcome" state={{ from: location }} replace />;
  }

  if (!onboarded) {
    return <Navigate to="/onboarding" state={{ from: location }} replace />;
  }

  return children;
}
