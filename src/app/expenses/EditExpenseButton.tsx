"use client";

import { useState } from "react";
import type { Expense } from "@prisma/client";
import ExpenseFormClient from "./ExpenseFormClient";

export default function EditExpenseButton({ expense }: { expense: Expense }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-800 hover:bg-slate-50"
      >
        Modifier
      </button>

      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-md rounded-3xl bg-white p-5 shadow-xl">
            <div className="flex items-center justify-between">
              <div className="text-lg font-extrabold text-slate-900">Modifier dépense</div>
              <button
                onClick={() => setOpen(false)}
                className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-800 hover:bg-slate-50"
              >
                Fermer
              </button>
            </div>

            <div className="mt-4">
              <ExpenseFormClient mode="edit" initial={expense} onDone={() => setOpen(false)} />
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
