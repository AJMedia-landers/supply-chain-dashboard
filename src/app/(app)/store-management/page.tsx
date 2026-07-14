"use client";
import { useMemo, useState } from "react";
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
  Chip,
  CircularProgress,
  Alert,
  Snackbar,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/context/AuthContext";
import { getStores, saveStore, deleteStore, type StoreCampaign } from "@/lib/store.api";

const ALLOWED_EMAIL = "ivan.plametiuk@ajmedia.io";

// Parse a free-text list of campaign ids ("111, 222 333") into unique positives.
function parseIds(input: string): number[] {
  const nums = input
    .split(/[\s,]+/)
    .map((x) => Number(x.trim()))
    .filter((n) => Number.isInteger(n) && n > 0);
  return [...new Set(nums)];
}

export default function StoreManagementPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const allowed = user?.email === ALLOWED_EMAIL;

  const [storeName, setStoreName] = useState("");
  const [campaignIds, setCampaignIds] = useState("");
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
    mutationFn: () => saveStore(storeName.trim(), parseIds(campaignIds)),
    onSuccess: (res) => {
      notify(res.data.message || "Saved", "success");
      setStoreName("");
      setCampaignIds("");
      queryClient.invalidateQueries({ queryKey: ["store-campaigns"] });
    },
    onError: (err) => notify(errMessage(err, "Failed to save"), "error"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteStore(id),
    onSuccess: () => {
      notify("Removed", "success");
      queryClient.invalidateQueries({ queryKey: ["store-campaigns"] });
    },
    onError: (err) => notify(errMessage(err, "Failed to remove"), "error"),
  });

  // Group the flat rows by store name.
  const grouped = useMemo(() => {
    const m = new Map<string, StoreCampaign[]>();
    for (const s of data?.stores ?? []) {
      const arr = m.get(s.store_name) ?? [];
      arr.push(s);
      m.set(s.store_name, arr);
    }
    return [...m.entries()]
      .map(([store_name, items]) => ({
        store_name,
        items: items.sort((a, b) => a.campaign_id - b.campaign_id),
      }))
      .sort((a, b) => a.store_name.localeCompare(b.store_name));
  }, [data]);

  if (!allowed) {
    return (
      <Alert severity="warning">
        You don&apos;t have access to Store Management.
      </Alert>
    );
  }

  const parsed = parseIds(campaignIds);
  const canSave =
    storeName.trim().length > 0 && parsed.length > 0 && !saveMutation.isPending;

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
        Map one or more CheckoutChamp campaign IDs to a store name.
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
              label="Campaign IDs"
              placeholder="e.g. 111, 222, 333"
              value={campaignIds}
              onChange={(e) => setCampaignIds(e.target.value.replace(/[^\d,\s]/g, ""))}
              helperText={
                parsed.length > 0
                  ? `${parsed.length} campaign${parsed.length === 1 ? "" : "s"}`
                  : "Comma or space separated"
              }
              sx={{ minWidth: 280 }}
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
              sx={{ mt: 0.5 }}
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
              <TableCell sx={{ fontWeight: 700, width: 240 }}>Store name</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Campaign IDs</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {isLoading && (
              <TableRow>
                <TableCell colSpan={2} align="center" sx={{ py: 4 }}>
                  <CircularProgress size={24} />
                </TableCell>
              </TableRow>
            )}
            {!isLoading && grouped.length === 0 && (
              <TableRow>
                <TableCell colSpan={2} align="center" sx={{ py: 4 }}>
                  <Typography color="text.secondary">
                    No stores yet. Add one above.
                  </Typography>
                </TableCell>
              </TableRow>
            )}
            {grouped.map((g) => (
              <TableRow key={g.store_name} hover>
                <TableCell sx={{ fontWeight: 600, verticalAlign: "top" }}>
                  {g.store_name}
                </TableCell>
                <TableCell>
                  <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                    {g.items.map((item) => (
                      <Chip
                        key={item.id}
                        label={item.campaign_id}
                        size="small"
                        onDelete={() => deleteMutation.mutate(item.id)}
                        disabled={deleteMutation.isPending}
                        sx={{ fontFamily: "monospace" }}
                      />
                    ))}
                  </Stack>
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
