export function Placeholder({ titulo }: { titulo: string }) {
  return (
    <div className="px-8 py-10">
      <p className="text-sm text-muted">{titulo}</p>
      <h1 className="font-display mt-1 text-2xl font-semibold text-navy">Em construção</h1>
      <p className="mt-2 max-w-md text-[0.9375rem] text-muted">
        Esta tela ainda não foi implementada — chega numa próxima parte do projeto.
      </p>
    </div>
  );
}
