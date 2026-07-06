"use client";
import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Alert,
  Link as MuiLink,
} from "@mui/material";
import { resetPassword, forgotPassword } from "@/lib/auth.api";
import { AxiosError } from "axios";
import type { ApiError } from "@/types";

function ResetPasswordInner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [email, setEmail] = useState(searchParams.get("email") ?? "");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setInfo("");

    if (code.length !== 6) {
      setError("Code must be 6 digits");
      return;
    }

    setLoading(true);
    try {
      const res = await resetPassword(email.trim(), code, newPassword);
      setInfo(res.data.message ?? "Password reset. You can now sign in.");
      setTimeout(() => router.replace("/login"), 1200);
    } catch (err) {
      const axiosErr = err as AxiosError<ApiError>;
      setError(
        axiosErr.response?.data?.errors?.[0]?.message ||
          axiosErr.response?.data?.message ||
          "Failed to reset password"
      );
    } finally {
      setLoading(false);
    }
  };

  const onResend = async () => {
    if (!email) {
      setError("Enter your email first");
      return;
    }
    setError("");
    setInfo("");
    setResending(true);
    try {
      const res = await forgotPassword(email.trim());
      setInfo(res.data.message ?? "A new code has been sent if the account exists.");
    } catch (err) {
      const axiosErr = err as AxiosError<ApiError>;
      setError(
        axiosErr.response?.data?.errors?.[0]?.message ||
          axiosErr.response?.data?.message ||
          "Failed to resend code"
      );
    } finally {
      setResending(false);
    }
  };

  return (
    <Box
      display="flex"
      justifyContent="center"
      alignItems="center"
      minHeight="100vh"
      bgcolor="background.default"
    >
      <Card sx={{ width: 400, p: 2 }}>
        <CardContent>
          <Typography variant="h5" fontWeight={700} gutterBottom textAlign="center">
            Reset password
          </Typography>
          <Typography variant="body2" color="text.secondary" textAlign="center" mb={3}>
            Enter the 6-digit code we emailed you and choose a new password.
          </Typography>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}
          {info && (
            <Alert severity="success" sx={{ mb: 2 }}>
              {info}
            </Alert>
          )}

          <form onSubmit={onSubmit}>
            <TextField
              label="Email"
              type="email"
              fullWidth
              margin="normal"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <TextField
              label="Reset code"
              fullWidth
              margin="normal"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              inputProps={{ inputMode: "numeric", maxLength: 6, pattern: "[0-9]{6}" }}
              required
            />
            <TextField
              label="New password"
              type="password"
              fullWidth
              margin="normal"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              helperText="At least 8 characters, with upper, lower and a number"
              required
            />
            <Button
              type="submit"
              variant="contained"
              fullWidth
              sx={{ mt: 2 }}
              disabled={loading || code.length !== 6 || !newPassword}
            >
              {loading ? "Resetting..." : "Reset password"}
            </Button>
            <Button
              type="button"
              variant="text"
              fullWidth
              sx={{ mt: 1 }}
              onClick={onResend}
              disabled={resending}
            >
              {resending ? "Sending..." : "Resend code"}
            </Button>
          </form>

          <Typography variant="body2" textAlign="center" mt={2}>
            <MuiLink component={Link} href="/login">
              Back to sign in
            </MuiLink>
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordInner />
    </Suspense>
  );
}
