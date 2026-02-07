import { ExpenseCategory } from "@prisma/client";

export const expenseCategories: { value: ExpenseCategory; label: string }[] = [
  { value: ExpenseCategory.DIVERS, label: "Divers" },
  { value: ExpenseCategory.LOYER_DEPOT, label: "Loyer / Dépôt" },
  { value: ExpenseCategory.ASSURANCE_MALADIE, label: "Assurance maladie" },
  { value: ExpenseCategory.ASSURANCE_LPP, label: "Assurance LPP" },
  { value: ExpenseCategory.SALAIRE_EMPLOYES, label: "Salaires employés" },
  { value: ExpenseCategory.SALAIRE_CADRES, label: "Salaires cadres" },
  { value: ExpenseCategory.GARAGE_REPARATIONS, label: "Garage / Réparations" },
  { value: ExpenseCategory.ASSURANCE_VEHICULE, label: "Assurance véhicule" },
];
