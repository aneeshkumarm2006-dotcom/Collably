/**
 * Renders one or more JSON-LD structured-data objects as a `<script>` tag.
 * Server-safe (no client JS). Pass a single object or an array (each becomes its
 * own script tag). The objects are produced by the builders in `lib/seo.ts`.
 */
export function JsonLd({ data }: { data: object | object[] }) {
  const items = Array.isArray(data) ? data : [data];
  return (
    <>
      {items.map((item, i) => (
        <script
          key={i}
          type="application/ld+json"
          // JSON.stringify output is safe to inline; escape `<` to be defensive.
          dangerouslySetInnerHTML={{ __html: JSON.stringify(item).replace(/</g, '\\u003c') }}
        />
      ))}
    </>
  );
}
