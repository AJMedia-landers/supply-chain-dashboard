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

const ALLOWED_DOMAIN = "ajmedia.io";

const schema = z.object({
  first_name: z.string().min(1, "First name is required"),
  last_name: z.string().min(1, "Last name is required"),
  email: z
    .string()
    .email("Valid email is required")
    .refine(
      (email) => email.split("@")[1]?.toLowerCase() === ALLOWED_DOMAIN,
      `Only @${ALLOWED_DOMAIN} email addresses are allowed`
    ),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Must contain an uppercase letter")
    .regex(/[a-z]/, "Must contain a lowercase letter")
    .regex(/[0-9]/, "Must contain a number"),
});

type FormData = z.infer<typeof schema>;

export default function SignupPage() {
  const router = useRouter();
  const { signup } = useAuth();
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
      const result = await signup(data);
      router.replace(`/verify?email=${encodeURIComponent(result.email)}`);
    } catch (err) {
      const axiosErr = err as AxiosError<ApiError>;
      setError(axiosErr.response?.data?.message ?? "Signup failed");
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
      <Card sx={{ width: 440, p: 2 }}>
        <CardContent>
          <Typography variant="h5" fontWeight={700} gutterBottom textAlign="center">
            Create Account
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
            <Box display="flex" gap={2}>
              <TextField
                label="First Name"
                fullWidth
                margin="normal"
                {...register("first_name")}
                error={!!errors.first_name}
                helperText={errors.first_name?.message}
                autoFocus
              />
              <TextField
                label="Last Name"
                fullWidth
                margin="normal"
                {...register("last_name")}
                error={!!errors.last_name}
                helperText={errors.last_name?.message}
              />
            </Box>
            <TextField
              label="Email"
              fullWidth
              margin="normal"
              {...register("email")}
              error={!!errors.email}
              helperText={
                errors.email?.message ??
                `Only @${ALLOWED_DOMAIN} email addresses are allowed`
              }
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
              {loading ? "Creating account..." : "Sign Up"}
            </Button>
          </form>

          <Typography variant="body2" textAlign="center" mt={2}>
            Already have an account?{" "}
            <MuiLink component={Link} href="/login">
              Sign in
            </MuiLink>
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
}
