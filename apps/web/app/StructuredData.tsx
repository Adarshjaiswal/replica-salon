interface StructuredDataProps {
  data: Record<string, unknown> | Array<Record<string, unknown>>;
}

export default function StructuredData({
  data,
}: StructuredDataProps): React.ReactElement {
  const json = JSON.stringify(data).replace(/</g, "\\u003c");

  return (
    <script
      dangerouslySetInnerHTML={{ __html: json }}
      type="application/ld+json"
    />
  );
}
