import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { api } from "../api/client";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [permissions, setPermissions] = useState([]); // raw rows
  const [loading, setLoading] = useState(true);

  const loadPermissions = useCallback(async () => {
    try {
      const data = await api.get("/auth/me/permissions");
      if (data) {
        setUser(data.user);
        setPermissions(data.permissions);
      }
    } catch {
      setUser(null);
      setPermissions([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (localStorage.getItem("token")) {
      loadPermissions();
    } else {
      setLoading(false);
    }
  }, [loadPermissions]);

  async function login(username, password) {
    const data = await api.post("/auth/login", { username, password });
    localStorage.setItem("token", data.token);
    await loadPermissions();
  }

  function logout() {
    localStorage.removeItem("token");
    setUser(null);
    setPermissions([]);
  }

  // permission lookup helpers
  const permMap = {};
  permissions.forEach((p) => (permMap[p.code] = p));

  function can(moduleCode, level = "view") {
    const p = permMap[moduleCode];
    if (!p) return false;
    return level === "edit" ? !!p.can_edit : !!p.can_view;
  }

  // distinct departments visible to this profile, in display order, with per-module-type access
  const deptMap = {};
  permissions
    .filter((p) => p.department_code)
    .forEach((p) => {
      if (!deptMap[p.department_code]) {
        deptMap[p.department_code] = { code: p.department_code, name: p.department_name, modules: {} };
      }
      deptMap[p.department_code].modules[p.module_type] = { can_view: !!p.can_view, can_edit: !!p.can_edit };
    });
  const departments = Object.values(deptMap);

  const systemModules = permissions.filter((p) => p.module_type === "SYSTEM");

  return (
    <AuthContext.Provider
      value={{ user, loading, login, logout, can, departments, systemModules, refreshPermissions: loadPermissions }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
