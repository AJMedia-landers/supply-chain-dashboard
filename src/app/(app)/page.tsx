"use client";
import { Box, Typography, Stack } from "@mui/material";
import { useAuth } from "@/context/AuthContext";

export default function DashboardPage() {
  const { user } = useAuth();

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h5" fontWeight={700}>
          Supply Chain Dashboard
        </Typography>
      </Stack>
      <Typography variant="body1" color="text.secondary">
        Welcome{user ? `, ${user.first_name}` : ""}. Dashboard content goes here.
      </Typography>
    </Box>
  );
}
