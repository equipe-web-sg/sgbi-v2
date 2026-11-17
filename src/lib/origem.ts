/**
 * Origem (`protocolo://host:porta`) que o navegador usou para chegar ao servidor.
 *
 * No Docker o container escuta na porta 3000 e o cliente acessa por outra (ex.:
 * `9000:3000`), e o `request.url` do Next traz o endereço de bind do servidor, não
 * esse. Redirecionar por ele mandaria o navegador para um endereço que não abre.
 * Atrás de proxy reverso valem `X-Forwarded-Host` e `X-Forwarded-Proto`.
 */
export function origemDoNavegador(
  headers: { get(nome: string): string | null },
  padrao: { host: string; protocolo: string },
): string {
  const primeiro = (valor: string | null) => valor?.split(",")[0]?.trim() || undefined;
  const host = primeiro(headers.get("x-forwarded-host")) ?? primeiro(headers.get("host")) ?? padrao.host;
  const protocolo = primeiro(headers.get("x-forwarded-proto")) ?? padrao.protocolo.replace(/:$/, "");
  return `${protocolo}://${host}`;
}
