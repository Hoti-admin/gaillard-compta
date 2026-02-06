// src/lib/expenseCategories.ts
import { ExpenseCategory } from "@prisma/client";

export const expenseCategories: { value: ExpenseCategory; label: string }[] = [
  { value: "RESTAURANT", label: "Restaurant" },
  { value: "CARBURANT", label: "Carburant" },
  { value: "PARKING", label: "Parking" },
  { value: "FOURNITURES", label: "Fournitures" },
  { value: "OUTILLAGE", label: "Outillage" },
  { value: "TELEPHONE", label: "Téléphone" },
  { value: "INTERNET", label: "Internet" },
  { value: "TRANSPORT", label: "Transport" },

  { value: "LOYER", label: "Loyer" },
  { value: "SALAIRE_EMPLOYE", label: "Salaire employé" },
  { value: "SALAIRE_CADRE", label: "Salaire cadre" },
  { value: "ASSURANCE_MALADIE", label: "Assurance maladie" },
  { value: "ASSURANCE_LPP", label: "Assurance LPP" },
  { value: "ASSURANCE_VEHICULE", label: "Assurance véhicule" },
  { value: "REPARATION_VEHICULE", label: "Réparation véhicule" },

  { value: "DIVERS", label: "Divers" },
  { value: "AUTRE", label: "Autre" },
];
