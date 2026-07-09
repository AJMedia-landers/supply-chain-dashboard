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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Paper,
  Tooltip,
  Avatar,
} from "@mui/material";
import FileDownloadIcon from "@mui/icons-material/FileDownload";
import ImageIcon from "@mui/icons-material/Image";
import { useQuery } from "@tanstack/react-query";
import { getSkuWeeklyUnits } from "@/lib/analytics.api";

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
  const [weeks, setWeeks] = useState(12);

  const dateFrom = useMemo(() => ymdDaysAgo((weeks - 1) * 7), [weeks]);
  const dateTo = useMemo(() => ymdDaysAgo(0), []);

  const { data, isLoading, error } = useQuery({
    queryKey: ["sku-weekly-units", dateFrom, dateTo],
    queryFn: () => getSkuWeeklyUnits(dateFrom, dateTo).then((r) => r.data),
  });

  const weekCols = data?.weeks ?? [];
  const skus = data?.skus ?? [];
  const totals = data?.totals ?? {};
  const colCount = weekCols.length + 3; // Product + SKU + weeks + Total

  const handleExport = () => {
    if (!data) return;
    const esc = (v: string) => `"${String(v).replace(/"/g, '""')}"`;
    const header = ["Product", "SKU", ...weekCols.map((w) => w.label), "Total"];
    const lines = [header.map(esc).join(",")];
    for (const row of skus) {
      const hasSku = !row.sku.startsWith("#");
      const cells = [
        row.productName ?? "",
        hasSku ? row.sku : "",
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
              <TableCell sx={{ ...productCol, zIndex: 3, fontWeight: 700 }}>Product</TableCell>
              <TableCell sx={{ ...skuCol, zIndex: 3, fontWeight: 700 }}>SKU</TableCell>
              {weekCols.map((w) => (
                <TableCell
                  key={w.weekStart}
                  align="right"
                  sx={{ fontWeight: 700, whiteSpace: "nowrap" }}
                >
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
                <TableCell colSpan={colCount} align="center" sx={{ py: 4 }}>
                  <CircularProgress size={24} />
                </TableCell>
              </TableRow>
            )}

            {!isLoading && skus.length === 0 && (
              <TableRow>
                <TableCell colSpan={colCount} align="center" sx={{ py: 4 }}>
                  <Typography color="text.secondary">
                    No units yet for this range.
                  </Typography>
                </TableCell>
              </TableRow>
            )}

            {skus.map((row) => {
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

            {!isLoading && skus.length > 0 && (
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
    </Box>
  );
}
