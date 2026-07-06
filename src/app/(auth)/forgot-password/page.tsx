"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
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
import { forgotPassword } from "@/lib/auth.api";
import { AxiosError } from "axios";
import type { ApiError } from "@/types";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setInfo("");
    setLoading(true);
    try {
      const res = await forgotPassword(email.trim());
      setInfo(res.data.message ?? "If an account exists, a reset code has been sent.");
      // Move on to the reset step with the email prefilled.
      setTimeout(() => {
        router.push(`/reset-password?email=${encodeURIComponent(email.trim())}`);
      }, 1200);
    } catch (err) {
      const axiosErr = err as AxiosError<ApiError>;
      setError(
        axiosErr.response?.data?.errors?.[0]?.message ||
          axiosErr.response?.data?.message ||
          "Failed to send reset code"
      );
    } finally {
      setLoading(false);
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
            Forgot password
          </Typography>
          <Typography variant="body2" color="text.secondary" textAlign="center" mb={3}>
            Enter your @ajmedia.io email and we&apos;ll send you a reset code.
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
              autoFocus
              required
            />
            <Button
              type="submit"
              variant="contained"
              fullWidth
              sx={{ mt: 2 }}
              disabled={loading || !email}
            >
              {loading ? "Sending..." : "Send reset code"}
            </Button>
          </form>

          <Typography variant="body2" textAlign="center" mt={2}>
            <MuiLink component={Link} href="/reset-password">
              I already have a code
            </MuiLink>
            {"  ·  "}
            <MuiLink component={Link} href="/login">
              Back to sign in
            </MuiLink>
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
}
