"use client";

import { useEffect, useState } from "react";
import type { Expense } from "@prisma/client";
import ExpenseFormClient from "./ExpenseFormClient";

export default function EditExpenseButton({ expense }: { expense: Expense }) {
  const [open, setOpen] = useState(false);

  // ✅ Bloque le scroll du fond quand le modal est ouvert
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  // ✅ ESC pour fermer
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-800 hover:bg-slate-50"
      >
        Modifier
      </button>

      {open ? (
        <div
          className="fixed inset-0 z-[100] flex items-end justify-center bg-black/50 px-4 py-6 sm:items-center"
          onMouseDown={(e) => {
            // clic sur le fond = fermer
            if (e.target === e.currentTarget) setOpen(false);
          }}
        >
          <div className="w-full max-w-md rounded-3xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <div className="text-lg font-extrabold text-slate-900">Modifier dépense</div>

              <button
                onClick={() => setOpen(false)}
                className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-800 hover:bg-slate-50"
                aria-label="Fermer"
              >
                ✕
              </button>
            </div>

            {/* ✅ zone scroll si petit écran / clavier mobile */}
            <div className="max-h-[75vh] overflow-y-auto px-5 py-4">
              <ExpenseFormClient mode="edit" initial={expense} onDone={() => setOpen(false)} />
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
