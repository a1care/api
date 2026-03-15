export function ModulePlaceholderPage({ title, description }: { title: string; description: string }) {
  return (
    <section className="card">
      <h1>{title}</h1>
      <p>{description}</p>
      <p className="muted">This module is scaffolded with role-protected routing and ready for API wiring.</p>
    </section>
  );
}

