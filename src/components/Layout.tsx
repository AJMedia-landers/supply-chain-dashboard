"use client";
import { useState, type ReactNode } from "react";
import { useRouter, usePathname } from "next/navigation";
import {
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Menu,
  MenuItem,
  Avatar,
  Box,
  Container,
  Tabs,
  Tab,
} from "@mui/material";
import { useAuth } from "@/context/AuthContext";

const NAV_ITEMS = [{ label: "Dashboard", path: "/" }];
const STORE_ADMIN_EMAIL = "ivan.plametiuk@ajmedia.io";

export default function Layout({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const initials = user
    ? `${user.first_name[0]}${user.last_name[0]}`.toUpperCase()
    : "";

  const navItems =
    user?.email === STORE_ADMIN_EMAIL
      ? [...NAV_ITEMS, { label: "Store Management", path: "/store-management" }]
      : NAV_ITEMS;
  const currentTab = navItems.findIndex((item) => item.path === pathname);

  const handleLogout = () => {
    setAnchorEl(null);
    logout();
    router.replace("/login");
  };

  return (
    <Box sx={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
      <AppBar position="sticky">
        <Toolbar>
          <Typography variant="h6" sx={{ flexGrow: 1, fontWeight: 700 }}>
            Supply Chain Dashboard
          </Typography>
          <IconButton onClick={(e) => setAnchorEl(e.currentTarget)} sx={{ p: 0 }}>
            <Avatar sx={{ bgcolor: "secondary.main", width: 36, height: 36, fontSize: 14 }}>
              {initials}
            </Avatar>
          </IconButton>
          <Menu
            anchorEl={anchorEl}
            open={!!anchorEl}
            onClose={() => setAnchorEl(null)}
            anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
            transformOrigin={{ vertical: "top", horizontal: "right" }}
          >
            <MenuItem disabled>
              {user?.first_name} {user?.last_name}
            </MenuItem>
            <MenuItem onClick={handleLogout}>Sign out</MenuItem>
          </Menu>
        </Toolbar>
      </AppBar>
      <Box sx={{ bgcolor: "background.paper", borderBottom: 1, borderColor: "divider" }}>
        <Container maxWidth="xl">
          <Tabs
            value={currentTab === -1 ? 0 : currentTab}
            onChange={(_, idx) => router.push(navItems[idx].path)}
            sx={{
              "& .MuiTab-root": { textTransform: "none", fontWeight: 600 },
            }}
          >
            {navItems.map((item) => (
              <Tab key={item.path} label={item.label} />
            ))}
          </Tabs>
        </Container>
      </Box>
      <Container maxWidth="xl" sx={{ py: 3, flex: 1 }}>
        {children}
      </Container>
    </Box>
  );
}
