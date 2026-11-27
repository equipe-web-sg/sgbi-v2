import { notFound } from "next/navigation";

/**
 * DFC oculta até existir fonte de caixa (P51): sem item no menu (`NAV` em `app-shell.tsx`) e a rota responde 404.
 * Para reativar, restaure o item do menu e a página (a tela segue em `src/features/financeiro/components/dfc.tsx`):
 *
 *   <AppShell><main className="flex-1 p-3"><Suspense><PortaoDaTela tela="dfc"><Dfc /></PortaoDaTela></Suspense></main></AppShell>
 */
export default function DfcPage() {
  notFound();
}
