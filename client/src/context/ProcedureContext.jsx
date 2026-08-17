import React, { createContext, useContext, useEffect, useState } from "react";
import { api } from "../api/client";
import { useAuth } from "./AuthContext";

const ProcedureContext = createContext(null);

export function ProcedureProvider({ children }) {
  const { user } = useAuth();
  const [procedures, setProcedures] = useState([]);
  const [selectedCode, setSelectedCode] = useState(() => localStorage.getItem("selectedProcedure") || "CABG");

  useEffect(() => {
    if (!user) return;
    api.get("/procedures").then((data) => {
      setProcedures(data || []);
      if (data?.length && !data.find((p) => p.code === selectedCode)) {
        setSelectedCode(data[0].code);
      }
    });
  }, [user]);

  function selectProcedure(code) {
    setSelectedCode(code);
    localStorage.setItem("selectedProcedure", code);
  }

  const selected = procedures.find((p) => p.code === selectedCode) || null;

  // group by specialty for the dropdown
  const bySpecialty = {};
  procedures.forEach((p) => {
    if (!bySpecialty[p.specialty_code]) bySpecialty[p.specialty_code] = { specialty_name: p.specialty_name, items: [] };
    bySpecialty[p.specialty_code].items.push(p);
  });

  return (
    <ProcedureContext.Provider value={{ procedures, bySpecialty, selectedCode, selected, selectProcedure }}>
      {children}
    </ProcedureContext.Provider>
  );
}

export function useProcedure() {
  return useContext(ProcedureContext);
}
