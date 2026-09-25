/**
 * Root landing page — served when visiting xeboki.store directly (no subdomain).
 * Shows a simple "find your store" page. Replace with a marketing landing page later.
 */
export default function RootPage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-surface-alt">
      <div className="text-center space-y-4 p-8">
        <h1 className="text-3xl font-bold text-fg">Xeboki Store</h1>
        <p className="text-fg-muted">
          Visit your merchant's store at{' '}
          <span className="font-mono text-fg">yourstore.xeboki.store</span>
        </p>
      </div>
    </main>
  );
}
