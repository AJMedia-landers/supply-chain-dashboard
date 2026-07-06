import { createTheme } from "@mui/material/styles";

const cappuccino = "#BF8E71";
const deepBrown = "#6E4E3B";
const sand = "#F4EDE7";
const cardBg = "#FFF7F0";
const divider = "#D7C6BA";

export const theme = createTheme({
  palette: {
    mode: "light",
    primary: { main: cappuccino, dark: "#9F6E51", light: "#D9AD91" },
    secondary: { main: deepBrown },
    background: { default: sand, paper: cardBg },
    divider,
    text: { primary: "#2D2A28", secondary: deepBrown },
    success: { main: "#2E7D32" },
    warning: { main: "#8A5B0A" },
  },
  shape: { borderRadius: 10 },
  components: {
    MuiPaper: {
      styleOverrides: {
        root: { backgroundImage: "none", border: `1px solid ${divider}` },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        colorPrimary: {
          backgroundColor: cappuccino,
          color: "#fff",
          boxShadow: "none",
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: { textTransform: "none", borderRadius: 10 },
      },
    },
  },
});
