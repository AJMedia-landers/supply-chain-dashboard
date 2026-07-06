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
import { useAuth } from "@/context/AuthContext";
import { resendVerification } from "@/lib/auth.api";
import { AxiosError } from "axios";
import type { ApiError } from "@/types";

function VerifyInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { verifyEmail } = useAuth();

  const [email, setEmail] = useState(searchParams.get("email") ?? "");
  const [code, setCode] = useState("");
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
      await verifyEmail(email, code);
      router.replace("/");
    } catch (err) {
      const axiosErr = err as AxiosError<ApiError>;
      setError(axiosErr.response?.data?.message ?? "Verification failed");
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
      const res = await resendVerification(email);
      setInfo(res.data.message ?? "A new code has been sent if the account exists.");
    } catch (err) {
      const axiosErr = err as AxiosError<ApiError>;
      setError(axiosErr.response?.data?.message ?? "Failed to resend code");
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
            Verify your email
          </Typography>
          <Typography variant="body2" color="text.secondary" textAlign="center" mb={3}>
            We sent a 6-digit code to your email. Enter it below to finish signing in.
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
              label="Verification code"
              fullWidth
              margin="normal"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              inputProps={{ inputMode: "numeric", maxLength: 6, pattern: "[0-9]{6}" }}
              autoFocus
              required
            />
            <Button
              type="submit"
              variant="contained"
              fullWidth
              sx={{ mt: 2 }}
              disabled={loading || code.length !== 6}
            >
              {loading ? "Verifying..." : "Verify email"}
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

export default function VerifyPage() {
  return (
    <Suspense fallback={null}>
      <VerifyInner />
    </Suspense>
  );
}
