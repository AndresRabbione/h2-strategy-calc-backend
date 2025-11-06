export function stationStrategicDescriptionToPlainText(
  htmlSnippet: string
): string {
  return (
    htmlSnippet
      // Remove opening span tags with any attributes
      .replace(/<span[^>]*>/g, "")
      // Remove closing span tags
      .replace(/<\/span>/g, "")
      .trim()
  );
}
