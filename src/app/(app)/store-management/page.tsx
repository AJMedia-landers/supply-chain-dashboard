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
  IconButton,
  Tooltip,
  CircularProgress,
  Alert,
  Snackbar,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import SaveIcon from "@mui/icons-material/Save";
import CloseIcon from "@mui/icons-material/Close";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/context/AuthContext";
import {
  getStores,
  saveStore,
  updateStore,
  deleteStore,
  type StoreCampaign,
} from "@/lib/store.api";

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

  // Add form
  const [storeName, setStoreName] = useState("");
  const [campaignIds, setCampaignIds] = useState("");

  // Inline edit (keyed by the store's original name)
  const [editing, setEditing] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editIds, setEditIds] = useState("");

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

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["store-campaigns"] });

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
      invalidate();
    },
    onError: (err) => notify(errMessage(err, "Failed to save"), "error"),
  });

  const updateMutation = useMutation({
    mutationFn: () =>
      updateStore(editing as string, editName.trim(), parseIds(editIds)),
    onSuccess: (res) => {
      notify(res.data.message || "Updated", "success");
      setEditing(null);
      invalidate();
    },
    onError: (err) => notify(errMessage(err, "Failed to update"), "error"),
  });

  const deleteMutation = useMutation({
    mutationFn: (name: string) => deleteStore(name),
    onSuccess: () => {
      notify("Store removed", "success");
      invalidate();
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
        ids: items
          .map((i) => i.campaign_id)
          .sort((a, b) => a - b),
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

  const parsedAdd = parseIds(campaignIds);
  const canAdd =
    storeName.trim().length > 0 && parsedAdd.length > 0 && !saveMutation.isPending;

  const canUpdate =
    editName.trim().length > 0 &&
    parseIds(editIds).length > 0 &&
    !updateMutation.isPending;

  const startEdit = (store_name: string, ids: number[]) => {
    setEditing(store_name);
    setEditName(store_name);
    setEditIds(ids.join(", "));
  };

  const onAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (canAdd) saveMutation.mutate();
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
        <Box component="form" onSubmit={onAddSubmit}>
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
                parsedAdd.length > 0
                  ? `${parsedAdd.length} campaign${parsedAdd.length === 1 ? "" : "s"}`
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
              disabled={!canAdd}
              sx={{ mt: 0.5 }}
            >
              {saveMutation.isPending ? "Saving..." : "Add"}
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
              <TableCell sx={{ fontWeight: 700, width: 260 }}>Store name</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Campaign IDs</TableCell>
              <TableCell align="right" sx={{ fontWeight: 700, width: 110 }}>
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
            {!isLoading && grouped.length === 0 && (
              <TableRow>
                <TableCell colSpan={3} align="center" sx={{ py: 4 }}>
                  <Typography color="text.secondary">
                    No stores yet. Add one above.
                  </Typography>
                </TableCell>
              </TableRow>
            )}
            {grouped.map((g) =>
              editing === g.store_name ? (
                <TableRow key={g.store_name}>
                  <TableCell sx={{ verticalAlign: "top" }}>
                    <TextField
                      size="small"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      fullWidth
                    />
                  </TableCell>
                  <TableCell>
                    <TextField
                      size="small"
                      value={editIds}
                      onChange={(e) =>
                        setEditIds(e.target.value.replace(/[^\d,\s]/g, ""))
                      }
                      placeholder="e.g. 111, 222, 333"
                      fullWidth
                    />
                  </TableCell>
                  <TableCell align="right" sx={{ whiteSpace: "nowrap" }}>
                    <Tooltip title="Save">
                      <span>
                        <IconButton
                          size="small"
                          color="primary"
                          onClick={() => updateMutation.mutate()}
                          disabled={!canUpdate}
                        >
                          <SaveIcon fontSize="small" />
                        </IconButton>
                      </span>
                    </Tooltip>
                    <Tooltip title="Cancel">
                      <IconButton size="small" onClick={() => setEditing(null)}>
                        <CloseIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ) : (
                <TableRow key={g.store_name} hover>
                  <TableCell sx={{ fontWeight: 600 }}>{g.store_name}</TableCell>
                  <TableCell sx={{ fontFamily: "monospace" }}>
                    {g.ids.join(", ")}
                  </TableCell>
                  <TableCell align="right" sx={{ whiteSpace: "nowrap" }}>
                    <Tooltip title="Edit">
                      <IconButton size="small" onClick={() => startEdit(g.store_name, g.ids)}>
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Delete store">
                      <span>
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => {
                            if (
                              window.confirm(`Delete store "${g.store_name}"?`)
                            ) {
                              deleteMutation.mutate(g.store_name);
                            }
                          }}
                          disabled={deleteMutation.isPending}
                        >
                          <DeleteOutlineIcon fontSize="small" />
                        </IconButton>
                      </span>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              )
            )}
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
