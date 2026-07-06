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
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "@/context/AuthContext";
import { AxiosError } from "axios";
import type { ApiError } from "@/types";

const schema = z.object({
  email: z.string().email("Valid email is required"),
  password: z.string().min(1, "Password is required"),
});

type FormData = z.infer<typeof schema>;

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    setError("");
    try {
      await login(data.email, data.password);
      router.replace("/");
    } catch (err) {
      const axiosErr = err as AxiosError<ApiError>;
      const errData = axiosErr.response?.data;
      if (errData?.data?.verification_required) {
        router.replace(
          `/verify?email=${encodeURIComponent(errData.data.email || data.email)}`
        );
        return;
      }
      setError(errData?.message ?? "Login failed");
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
            Sign In
          </Typography>
          <Typography variant="body2" color="text.secondary" textAlign="center" mb={3}>
            Supply Chain Dashboard
          </Typography>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <form onSubmit={handleSubmit(onSubmit)}>
            <TextField
              label="Email"
              fullWidth
              margin="normal"
              {...register("email")}
              error={!!errors.email}
              helperText={errors.email?.message}
              autoFocus
            />
            <TextField
              label="Password"
              type="password"
              fullWidth
              margin="normal"
              {...register("password")}
              error={!!errors.password}
              helperText={errors.password?.message}
            />
            <Button
              type="submit"
              variant="contained"
              fullWidth
              sx={{ mt: 2 }}
              disabled={loading}
            >
              {loading ? "Signing in..." : "Sign In"}
            </Button>
          </form>

          <Typography variant="body2" textAlign="center" mt={2}>
            <MuiLink component={Link} href="/forgot-password">
              Forgot password?
            </MuiLink>
          </Typography>

          <Typography variant="body2" textAlign="center" mt={1}>
            Don&apos;t have an account?{" "}
            <MuiLink component={Link} href="/signup">
              Sign up
            </MuiLink>
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
}
