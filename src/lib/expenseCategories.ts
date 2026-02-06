import type { ExpenseCategory } from "@prisma/client";

export const EXPENSE_CATEGORIES: Array<{ value: ExpenseCategory; label: string }> = [
  { value: "RESTAURANT", label: "Restaurant" },
  { value: "CARBURANT", label: "Carburant" },
  { value: "PARKING", label: "Parking" },
  { value: "FOURNITURES", label: "Fournitures" },
  { value: "OUTILLAGE", label: "Outillage" },
  { value: "TELEPHONE", label: "Téléphone" },
  { value: "INTERNET", label: "Internet" },
  { value: "TRANSPORT", label: "Transport" },
  { value: "DIVERS", label: "Divers" },

  { value: "LOYER_DEPOT", label: "Loyer / Dépôt" },
  { value: "ASSURANCE_MALADIE", label: "Assurance maladie" },
  { value: "ASSURANCE_LPP", label: "Assurance LPP" },
  { value: "SALAIRE_EMPLOYES", label: "Salaires employés" },
  { value: "SALAIRE_CADRES", label: "Salaires cadres" },
  { value: "GARAGE_REPARATIONS", label: "Garage / réparations véhicules" },
  { value: "ASSURANCE_VEHICULE", label: "Assurance véhicule" },
];
