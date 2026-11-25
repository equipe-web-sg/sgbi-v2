/** Legenda de situações no cabeçalho de tabela: um ponto colorido por situação possível (o nome fica no título). */
export function SituacaoPontos({ itens }: { itens: { label: string; classe: string }[] }) {
  return (
    <span className="inline-flex items-center justify-center gap-1.5">
      {itens.map((item) => (
        <span key={item.label} className={`size-2 rounded-full ${item.classe}`} title={item.label} aria-label={item.label} />
      ))}
    </span>
  );
}
