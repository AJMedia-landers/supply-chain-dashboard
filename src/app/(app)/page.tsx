"use client";
import { useMemo, useState } from "react";
import {
  Box,
  Typography,
  Stack,
  Button,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  CircularProgress,
  Alert,
  Snackbar,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Paper,
  Tooltip,
} from "@mui/material";
import SyncIcon from "@mui/icons-material/Sync";
import FileDownloadIcon from "@mui/icons-material/FileDownload";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getSkuWeeklyUnits, syncSkuUnits } from "@/lib/analytics.api";

// ymd for `daysAgo` days before today (local).
function ymdDaysAgo(daysAgo: number): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
}

const RANGE_OPTIONS = [
  { weeks: 8, label: "Last 8 weeks" },
  { weeks: 12, label: "Last 12 weeks" },
  { weeks: 26, label: "Last 26 weeks" },
  { weeks: 52, label: "Last 52 weeks" },
];

// Display: blank for zero/empty, negatives in red.
const NEG = "#c62828";

export default function DashboardPage() {
  const queryClient = useQueryClient();
  const [weeks, setWeeks] = useState(12);
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: "success" | "error";
  }>({ open: false, message: "", severity: "success" });

  const dateFrom = useMemo(() => ymdDaysAgo((weeks - 1) * 7), [weeks]);
  const dateTo = useMemo(() => ymdDaysAgo(0), []);

  const { data, isLoading, error } = useQuery({
    queryKey: ["sku-weekly-units", dateFrom, dateTo],
    queryFn: () => getSkuWeeklyUnits(dateFrom, dateTo).then((r) => r.data),
  });

  const syncMutation = useMutation({
    mutationFn: () => syncSkuUnits(),
    onSuccess: (res) => {
      setSnackbar({
        open: true,
        message: res.data.message || "Data refreshed",
        severity: "success",
      });
      queryClient.invalidateQueries({ queryKey: ["sku-weekly-units"] });
    },
    onError: (err: unknown) => {
      const message =
        (err as { response?: { data?: { message?: string } }; message?: string })
          ?.response?.data?.message ||
        (err as Error)?.message ||
        "Failed to refresh data";
      setSnackbar({ open: true, message, severity: "error" });
    },
  });

  const weekCols = data?.weeks ?? [];
  const skus = data?.skus ?? [];
  const totals = data?.totals ?? {};

  const handleExport = () => {
    if (!data) return;
    const esc = (v: string) => `"${String(v).replace(/"/g, '""')}"`;
    const header = ["SKU", "Product", ...weekCols.map((w) => w.label), "Total"];
    const lines = [header.map(esc).join(",")];
    for (const row of skus) {
      const cells = [
        row.sku,
        row.productName ?? "",
        ...weekCols.map((w) => String(row.units[w.weekStart] ?? "")),
        String(row.total),
      ];
      lines.push(cells.map(esc).join(","));
    }
    const totalCells = [
      "TOTAL",
      "",
      ...weekCols.map((w) => String(totals[w.weekStart] ?? "")),
      String(Object.values(totals).reduce((a, b) => a + b, 0)),
    ];
    lines.push(totalCells.map(esc).join(","));

    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `weekly-units-sold-${dateFrom}_to_${dateTo}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const cell = (value: number | undefined, bold = false) => {
    if (!value) return null; // blank for 0/undefined
    return (
      <span style={{ color: value < 0 ? NEG : undefined, fontWeight: bold ? 700 : undefined }}>
        {value}
      </span>
    );
  };

  const stickyCol = {
    position: "sticky" as const,
    left: 0,
    zIndex: 2,
    bgcolor: "background.paper",
    borderRight: 1,
    borderColor: "divider",
    minWidth: 200,
  };

  return (
    <Box>
      <Stack
        direction="row"
        justifyContent="space-between"
        alignItems="center"
        mb={3}
        flexWrap="wrap"
        gap={2}
      >
        <Box>
          <Typography variant="h5" fontWeight={700}>
            Weekly Units Sold
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Net units per SKU (sales minus refunds), by week.
          </Typography>
        </Box>
        <Stack direction="row" spacing={2} alignItems="center">
          <FormControl size="small" sx={{ minWidth: 160 }}>
            <InputLabel id="range-label">Range</InputLabel>
            <Select
              labelId="range-label"
              label="Range"
              value={weeks}
              onChange={(e) => setWeeks(Number(e.target.value))}
            >
              {RANGE_OPTIONS.map((o) => (
                <MenuItem key={o.weeks} value={o.weeks}>
                  {o.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <Button
            variant="outlined"
            startIcon={<FileDownloadIcon />}
            onClick={handleExport}
            disabled={!data || skus.length === 0}
          >
            Export CSV
          </Button>
          <Button
            variant="contained"
            startIcon={
              syncMutation.isPending ? (
                <CircularProgress size={18} color="inherit" />
              ) : (
                <SyncIcon />
              )
            }
            onClick={() => syncMutation.mutate()}
            disabled={syncMutation.isPending}
          >
            {syncMutation.isPending ? "Refreshing..." : "Refresh data"}
          </Button>
        </Stack>
      </Stack>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {(error as Error).message || "Failed to load data"}
        </Alert>
      )}

      <Paper variant="outlined" sx={{ overflowX: "auto" }}>
        <Table size="small" stickyHeader sx={{ minWidth: 640 }}>
          <TableHead>
            <TableRow>
              <TableCell sx={{ ...stickyCol, zIndex: 3, fontWeight: 700 }}>SKU</TableCell>
              {weekCols.map((w) => (
                <TableCell key={w.weekStart} align="right" sx={{ fontWeight: 700, whiteSpace: "nowrap" }}>
                  {w.label}
                </TableCell>
              ))}
              <TableCell align="right" sx={{ fontWeight: 700 }}>
                Total
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {isLoading && (
              <TableRow>
                <TableCell colSpan={weekCols.length + 2} align="center" sx={{ py: 4 }}>
                  <CircularProgress size={24} />
                </TableCell>
              </TableRow>
            )}

            {!isLoading && skus.length === 0 && (
              <TableRow>
                <TableCell colSpan={weekCols.length + 2} align="center" sx={{ py: 4 }}>
                  <Typography color="text.secondary">
                    No units yet. Click “Refresh data” to pull recent orders.
                  </Typography>
                </TableCell>
              </TableRow>
            )}

            {skus.map((row) => {
              const noSku = row.sku.startsWith("#");
              return (
                <TableRow key={row.sku} hover>
                  <TableCell sx={stickyCol}>
                    <Tooltip title={row.productName ?? ""} placement="right">
                      <Box>
                        <Typography variant="body2" fontWeight={600}>
                          {noSku ? row.productName || row.sku : row.sku}
                        </Typography>
                        {noSku ? (
                          <Typography variant="caption" color="text.secondary">
                            no SKU
                          </Typography>
                        ) : (
                          row.productName && (
                            <Typography
                              variant="caption"
                              color="text.secondary"
                              sx={{
                                display: "block",
                                maxWidth: 240,
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                              }}
                            >
                              {row.productName}
                            </Typography>
                          )
                        )}
                      </Box>
                    </Tooltip>
                  </TableCell>
                  {weekCols.map((w) => (
                    <TableCell key={w.weekStart} align="right">
                      {cell(row.units[w.weekStart])}
                    </TableCell>
                  ))}
                  <TableCell align="right">{cell(row.total, true)}</TableCell>
                </TableRow>
              );
            })}

            {!isLoading && skus.length > 0 && (
              <TableRow>
                <TableCell sx={{ ...stickyCol, fontWeight: 700 }}>Total</TableCell>
                {weekCols.map((w) => (
                  <TableCell key={w.weekStart} align="right">
                    {cell(totals[w.weekStart], true)}
                  </TableCell>
                ))}
                <TableCell align="right">
                  {cell(
                    Object.values(totals).reduce((a, b) => a + b, 0),
                    true
                  )}
                </TableCell>
              </TableRow>
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
