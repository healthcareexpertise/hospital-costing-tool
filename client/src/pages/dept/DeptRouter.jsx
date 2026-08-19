import React from "react";
import { useParams } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import MasterPage from "./MasterPage";
import InputPage from "./InputPage";
import OutputPage from "./OutputPage";
import DashboardPage from "./DashboardPage";
import TestMasterPage from "./TestMasterPage";
import TestInputPage from "./TestInputPage";
import TestOutputPage from "./TestOutputPage";
import TestDashboardPage from "./TestDashboardPage";

const PAGE_MAP = {
  master: { FULL: MasterPage, SIMPLE: MasterPage, PER_TEST: TestMasterPage },
  input: { FULL: InputPage, SIMPLE: InputPage, PER_TEST: TestInputPage },
  output: { FULL: OutputPage, SIMPLE: OutputPage, PER_TEST: TestOutputPage },
  dashboard: { FULL: DashboardPage, SIMPLE: DashboardPage, PER_TEST: TestDashboardPage },
};

// Picks the right page component based on this department's engine_type — procedure-package
// departments (FULL/SIMPLE) use the 5-cost-head UI, Lab/Radiology (PER_TEST) use the
// per-test price-list UI. Falls back to the procedure-package UI while permissions are loading.
export default function DeptRouter({ view }) {
  const { deptCode } = useParams();
  const { departments } = useAuth();
  const dept = departments.find((d) => d.code === deptCode);
  const Component = PAGE_MAP[view][dept?.engine_type || "FULL"];
  return <Component />;
}
