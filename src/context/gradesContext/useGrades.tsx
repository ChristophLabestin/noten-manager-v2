import { useContext } from "react";
import { GradesContext } from "./context";

export const useGrades = () => {
  const context = useContext(GradesContext);
  if (!context) {
    throw new Error("useGrades must be used within a GradesProvider");
  }
  return context;
};

