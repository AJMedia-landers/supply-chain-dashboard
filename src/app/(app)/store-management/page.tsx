"use client";
import { useState } from "react";
import {
  Box,
  Typography,
  Stack,
  Button,
  TextField,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  IconButton,
  CircularProgress,
  Alert,
  Snackbar,
  Tooltip,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/context/AuthContext";
import { getStores, saveStore, deleteStore } from "@/lib/store.api";

const ALLOWED_EMAIL = "ivan.plametiuk@ajmedia.io";

export default function StoreManagementPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const allowed = user?.email === ALLOWED_EMAIL;

  const [storeName, setStoreName] = useState("");
  const [campaignId, setCampaignId] = useState("");
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: "success" | "error";
  }>({ open: false, message: "", severity: "success" });

  const notify = (message: string, severity: "success" | "error") =>
    setSnackbar({ open: true, message, severity });

  const errMessage = (err: unknown, fallback: string) =>
    (err as { response?: { data?: { message?: string } }; message?: string })
      ?.response?.data?.message ||
    (err as Error)?.message ||
    fallback;

  const { data, isLoading, error } = useQuery({
    queryKey: ["store-campaigns"],
    queryFn: () => getStores().then((r) => r.data),
    enabled: allowed,
  });

  const saveMutation = useMutation({
    mutationFn: () => saveStore(storeName.trim(), Number(campaignId)),
    onSuccess: (res) => {
      notify(res.data.message || "Saved", "success");
      setStoreName("");
      setCampaignId("");
      queryClient.invalidateQueries({ queryKey: ["store-campaigns"] });
    },
    onError: (err) => notify(errMessage(err, "Failed to save"), "error"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteStore(id),
    onSuccess: () => {
      notify("Deleted", "success");
      queryClient.invalidateQueries({ queryKey: ["store-campaigns"] });
    },
    onError: (err) => notify(errMessage(err, "Failed to delete"), "error"),
  });

  if (!allowed) {
    return (
      <Alert severity="warning">
        You don&apos;t have access to Store Management.
      </Alert>
    );
  }

  const stores = data?.stores ?? [];
  const canSave =
    storeName.trim().length > 0 &&
    /^\d+$/.test(campaignId.trim()) &&
    Number(campaignId) > 0 &&
    !saveMutation.isPending;

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (canSave) saveMutation.mutate();
  };

  return (
    <Box>
      <Typography variant="h5" fontWeight={700}>
        Store Management
      </Typography>
      <Typography variant="body2" color="text.secondary" mb={3}>
        Map a CheckoutChamp campaign ID to a store name.
      </Typography>

      <Paper variant="outlined" sx={{ p: 2, mb: 3 }}>
        <Box component="form" onSubmit={onSubmit}>
          <Stack direction="row" spacing={2} alignItems="flex-start" flexWrap="wrap" useFlexGap>
            <TextField
              size="small"
              label="Store name"
              value={storeName}
              onChange={(e) => setStoreName(e.target.value)}
              sx={{ minWidth: 240 }}
            />
            <TextField
              size="small"
              label="Campaign ID"
              value={campaignId}
              onChange={(e) => setCampaignId(e.target.value.replace(/\D/g, ""))}
              inputProps={{ inputMode: "numeric" }}
              sx={{ minWidth: 180 }}
            />
            <Button
              type="submit"
              variant="contained"
              startIcon={
                saveMutation.isPending ? (
                  <CircularProgress size={18} color="inherit" />
                ) : (
                  <AddIcon />
                )
              }
              disabled={!canSave}
            >
              {saveMutation.isPending ? "Saving..." : "Save"}
            </Button>
          </Stack>
        </Box>
      </Paper>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {errMessage(error, "Failed to load stores")}
        </Alert>
      )}

      <Paper variant="outlined" sx={{ overflowX: "auto" }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 700 }}>Store name</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Campaign ID</TableCell>
              <TableCell align="right" sx={{ fontWeight: 700, width: 80 }}>
                Actions
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {isLoading && (
              <TableRow>
                <TableCell colSpan={3} align="center" sx={{ py: 4 }}>
                  <CircularProgress size={24} />
                </TableCell>
              </TableRow>
            )}
            {!isLoading && stores.length === 0 && (
              <TableRow>
                <TableCell colSpan={3} align="center" sx={{ py: 4 }}>
                  <Typography color="text.secondary">
                    No stores yet. Add one above.
                  </Typography>
                </TableCell>
              </TableRow>
            )}
            {stores.map((s) => (
              <TableRow key={s.id} hover>
                <TableCell>{s.store_name}</TableCell>
                <TableCell sx={{ fontFamily: "monospace" }}>{s.campaign_id}</TableCell>
                <TableCell align="right">
                  <Tooltip title="Delete">
                    <span>
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => deleteMutation.mutate(s.id)}
                        disabled={deleteMutation.isPending}
                      >
                        <DeleteOutlineIcon fontSize="small" />
                      </IconButton>
                    </span>
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={5000}
        onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          severity={snackbar.severity}
          variant="filled"
          onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
