import { useState, useEffect } from "react";
import { ShieldAlert, X } from "lucide-react";
import { Button } from "@/components/ui/button";

const STORAGE_KEY = "adult_content_confirmed";

export function isAdultConfirmed(): boolean {
  return sessionStorage.getItem(STORAGE_KEY) === "true";
}

export function confirmAdultAccess(): void {
  sessionStorage.setItem(STORAGE_KEY, "true");
}

interface AgeGateProps {
  onConfirm: () => void;
  onCancel: () => void;
}

export default function AgeGate({ onConfirm, onCancel }: AgeGateProps) {
  return (
    <div className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-card rounded-2xl shadow-2xl max-w-sm w-full p-6 text-center relative">
        <button onClick={onCancel} className="absolute top-3 right-3 text-muted-foreground hover:text-foreground">
          <X className="h-4 w-4" />
        </button>
        <div className="h-16 w-16 rounded-full bg-red-50 dark:bg-red-500/10 flex items-center justify-center mx-auto mb-4">
          <ShieldAlert className="h-8 w-8 text-red-500" />
        </div>
        <h2 className="text-lg font-bold mb-2">Conteudo para Adultos</h2>
        <p className="text-sm text-muted-foreground mb-1">
          Esta seccao contem produtos destinados exclusivamente a <strong>maiores de 18 anos</strong>.
        </p>
        <p className="text-xs text-muted-foreground mb-6">
          Ao continuar, confirma que tem 18 anos ou mais.
        </p>
        <div className="flex gap-3">
          <Button variant="outline" className="flex-1" onClick={onCancel}>
            Voltar
          </Button>
          <Button
            className="flex-1 bg-red-500 hover:bg-red-600 text-white"
            onClick={() => {
              confirmAdultAccess();
              onConfirm();
            }}
          >
            Tenho 18+ anos
          </Button>
        </div>
      </div>
    </div>
  );
}
