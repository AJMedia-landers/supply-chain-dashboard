"use client";
import { useEffect, useMemo, useState } from "react";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Paper,
  Tooltip,
  Avatar,
  TextField,
  TableSortLabel,
  InputAdornment,
  TablePagination,
  Snackbar,
} from "@mui/material";
import FileDownloadIcon from "@mui/icons-material/FileDownload";
import ImageIcon from "@mui/icons-material/Image";
import SearchIcon from "@mui/icons-material/Search";
import SyncIcon from "@mui/icons-material/Sync";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getSkuWeeklyUnits, syncSkuUnits, type WeeklySkuRow } from "@/lib/analytics.api";
import { useAuth } from "@/context/AuthContext";

const SYNC_EMAIL = "ivan.plametiuk@ajmedia.io";

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

const NEG = "#c62828";
const PRODUCT_W = 280;
const SKU_W = 150;

export default function DashboardPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const canSync = user?.email === SYNC_EMAIL;

  const [weeks, setWeeks] = useState(8);

  // Manual sync (restricted to SYNC_EMAIL) — pick an explicit date range.
  const [syncFrom, setSyncFrom] = useState(ymdDaysAgo(2));
  const [syncTo, setSyncTo] = useState(ymdDaysAgo(0));
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

  const weekCols = data?.weeks ?? [];
  const skus = data?.skus ?? [];
  const colCount = weekCols.length + 3; // Product + SKU + weeks + Total

  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<string>("total");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const handleSort = (key: string, numeric: boolean) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir(numeric ? "desc" : "asc");
    }
  };

  // Search filter + sort (client-side over the returned rows).
  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    const filtered = q
      ? skus.filter(
          (r) =>
            (r.productName ?? "").toLowerCase().includes(q) ||
            r.sku.toLowerCase().includes(q)
        )
      : skus;

    const dir = sortDir === "asc" ? 1 : -1;
    const valOf = (r: WeeklySkuRow): string | number => {
      if (sortKey === "product") return (r.productName ?? "").toLowerCase();
      if (sortKey === "sku") return r.sku.toLowerCase();
      if (sortKey === "total") return r.total;
      return r.units[sortKey] ?? 0; // a week column
    };

    return [...filtered].sort((a, b) => {
      const va = valOf(a);
      const vb = valOf(b);
      if (typeof va === "string" && typeof vb === "string") {
        return va.localeCompare(vb) * dir;
      }
      return ((va as number) - (vb as number)) * dir;
    });
  }, [skus, search, sortKey, sortDir]);

  // Totals reflect the currently shown (filtered) rows.
  const weekTotals = useMemo(() => {
    const t: Record<string, number> = {};
    for (const w of weekCols) t[w.weekStart] = 0;
    for (const r of rows) {
      for (const w of weekCols) t[w.weekStart] += r.units[w.weekStart] ?? 0;
    }
    return t;
  }, [rows, weekCols]);

  const grandTotal = useMemo(
    () => Object.values(weekTotals).reduce((a, b) => a + b, 0),
    [weekTotals]
  );

  // Pagination (client-side over the filtered/sorted rows).
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(500);

  // Reset to the first page whenever the result set changes.
  useEffect(() => {
    setPage(0);
  }, [search, sortKey, sortDir, weeks]);

  const pageRows = useMemo(
    () => rows.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage),
    [rows, page, rowsPerPage]
  );

  const syncMutation = useMutation({
    mutationFn: () => syncSkuUnits(syncFrom, syncTo),
    onSuccess: (res) => {
      setSnackbar({
        open: true,
        message: res.data.message || "Sync complete",
        severity: "success",
      });
      queryClient.invalidateQueries({ queryKey: ["sku-weekly-units"] });
    },
    onError: (err: unknown) => {
      const message =
        (err as { response?: { data?: { message?: string } }; message?: string })
          ?.response?.data?.message ||
        (err as Error)?.message ||
        "Sync failed";
      setSnackbar({ open: true, message, severity: "error" });
    },
  });

  const handleExport = () => {
    if (!data) return;
    const esc = (v: string) => `"${String(v).replace(/"/g, '""')}"`;
    const header = ["Product", "SKU", ...weekCols.map((w) => w.label), "Total"];
    const lines = [header.map(esc).join(",")];
    for (const row of rows) {
      const cells = [
        row.productName ?? "",
        row.sku,
        ...weekCols.map((w) => String(row.units[w.weekStart] ?? "")),
        String(row.total),
      ];
      lines.push(cells.map(esc).join(","));
    }
    const totalCells = [
      "TOTAL",
      "",
      ...weekCols.map((w) => String(weekTotals[w.weekStart] ?? "")),
      String(grandTotal),
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

  const productCol = {
    position: "sticky" as const,
    left: 0,
    zIndex: 2,
    bgcolor: "background.paper",
    minWidth: PRODUCT_W,
    width: PRODUCT_W,
  };
  const skuCol = {
    position: "sticky" as const,
    left: PRODUCT_W,
    zIndex: 2,
    bgcolor: "background.paper",
    minWidth: SKU_W,
    width: SKU_W,
    borderRight: 1,
    borderColor: "divider",
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
          <TextField
            size="small"
            placeholder="Search product or SKU"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" />
                </InputAdornment>
              ),
            }}
            sx={{ minWidth: 240 }}
          />
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
        </Stack>
      </Stack>

      {canSync && (
        <Stack
          direction="row"
          spacing={2}
          alignItems="center"
          mb={2}
          flexWrap="wrap"
          useFlexGap
        >
          <Typography variant="body2" color="text.secondary">
            Manual sync:
          </Typography>
          <TextField
            size="small"
            type="date"
            label="From"
            InputLabelProps={{ shrink: true }}
            value={syncFrom}
            onChange={(e) => setSyncFrom(e.target.value)}
          />
          <TextField
            size="small"
            type="date"
            label="To"
            InputLabelProps={{ shrink: true }}
            value={syncTo}
            onChange={(e) => setSyncTo(e.target.value)}
          />
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
            disabled={syncMutation.isPending || !syncFrom || !syncTo}
          >
            {syncMutation.isPending ? "Syncing..." : "Sync"}
          </Button>
        </Stack>
      )}

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {(error as Error).message || "Failed to load data"}
        </Alert>
      )}

      <Paper variant="outlined" sx={{ overflowX: "auto" }}>
        <Table
          size="small"
          stickyHeader
          sx={{
            minWidth: 720,
            // Vertical column dividers on every cell (MUI draws none by default).
            "& th, & td": {
              borderRight: "1px solid",
              borderColor: "divider",
            },
            "& th:last-of-type, & td:last-of-type": {
              borderRight: 0,
            },
            // Opaque header (covers rows on vertical scroll) with a clear underline.
            "& thead th": {
              backgroundColor: "background.paper",
              borderBottom: "2px solid",
              borderColor: "divider",
            },
            // Hover shades the whole row, including the sticky Product/SKU cells.
            "& tbody tr:not(:last-child):hover td": {
              backgroundColor: "action.hover",
            },
            // Totals row separated by a top rule.
            "& tbody tr:last-child td": {
              borderTop: "2px solid",
              borderColor: "divider",
            },
          }}
        >
          <TableHead>
            <TableRow>
              <TableCell sx={{ ...productCol, zIndex: 3, fontWeight: 700 }}>
                <TableSortLabel
                  active={sortKey === "product"}
                  direction={sortKey === "product" ? sortDir : "asc"}
                  onClick={() => handleSort("product", false)}
                >
                  Product
                </TableSortLabel>
              </TableCell>
              <TableCell sx={{ ...skuCol, zIndex: 3, fontWeight: 700 }}>
                <TableSortLabel
                  active={sortKey === "sku"}
                  direction={sortKey === "sku" ? sortDir : "asc"}
                  onClick={() => handleSort("sku", false)}
                >
                  SKU
                </TableSortLabel>
              </TableCell>
              {weekCols.map((w) => (
                <TableCell
                  key={w.weekStart}
                  align="right"
                  sx={{ fontWeight: 700, whiteSpace: "nowrap" }}
                >
                  <TableSortLabel
                    active={sortKey === w.weekStart}
                    direction={sortKey === w.weekStart ? sortDir : "desc"}
                    onClick={() => handleSort(w.weekStart, true)}
                  >
                    {w.label}
                  </TableSortLabel>
                </TableCell>
              ))}
              <TableCell align="right" sx={{ fontWeight: 700 }}>
                <TableSortLabel
                  active={sortKey === "total"}
                  direction={sortKey === "total" ? sortDir : "desc"}
                  onClick={() => handleSort("total", true)}
                >
                  Total
                </TableSortLabel>
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {isLoading && (
              <TableRow>
                <TableCell colSpan={colCount} align="center" sx={{ py: 4 }}>
                  <CircularProgress size={24} />
                </TableCell>
              </TableRow>
            )}

            {!isLoading && rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={colCount} align="center" sx={{ py: 4 }}>
                  <Typography color="text.secondary">
                    {search
                      ? "No products match your search."
                      : "No units yet for this range."}
                  </Typography>
                </TableCell>
              </TableRow>
            )}

            {pageRows.map((row) => {
              const hasSku = !row.sku.startsWith("#");
              const productName = row.productName || (hasSku ? row.sku : row.sku);
              return (
                <TableRow key={row.sku}>
                  <TableCell sx={productCol}>
                    <Stack direction="row" alignItems="center" spacing={1}>
                      <Avatar
                        variant="rounded"
                        src={row.productImage || undefined}
                        alt={productName}
                        sx={{ width: 36, height: 36, bgcolor: "action.hover", flexShrink: 0 }}
                      >
                        <ImageIcon fontSize="small" sx={{ color: "text.disabled" }} />
                      </Avatar>
                      <Tooltip title={productName} placement="right">
                        <Typography
                          variant="body2"
                          fontWeight={600}
                          sx={{
                            maxWidth: PRODUCT_W - 64,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {productName}
                        </Typography>
                      </Tooltip>
                    </Stack>
                  </TableCell>
                  <TableCell sx={skuCol}>
                    {hasSku ? (
                      <Typography variant="body2" sx={{ fontFamily: "monospace" }}>
                        {row.sku}
                      </Typography>
                    ) : (
                      <Typography variant="caption" color="text.secondary">
                        no SKU
                      </Typography>
                    )}
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

            {!isLoading && rows.length > 0 && (
              <TableRow>
                <TableCell
                  colSpan={2}
                  sx={{
                    position: "sticky",
                    left: 0,
                    zIndex: 2,
                    bgcolor: "background.paper",
                    minWidth: PRODUCT_W + SKU_W,
                    borderRight: 1,
                    borderColor: "divider",
                    fontWeight: 700,
                  }}
                >
                  Total
                </TableCell>
                {weekCols.map((w) => (
                  <TableCell key={w.weekStart} align="right">
                    {cell(weekTotals[w.weekStart], true)}
                  </TableCell>
                ))}
                <TableCell align="right">{cell(grandTotal, true)}</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Paper>

      <TablePagination
        component="div"
        count={rows.length}
        page={page}
        onPageChange={(_, p) => setPage(p)}
        rowsPerPage={rowsPerPage}
        onRowsPerPageChange={(e) => {
          setRowsPerPage(parseInt(e.target.value, 10));
          setPage(0);
        }}
        rowsPerPageOptions={[25, 50, 100, 500]}
      />

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
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
