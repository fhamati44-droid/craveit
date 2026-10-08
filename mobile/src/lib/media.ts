// Match Drive share-link resolution from the web project's imageUtils.js.
export function imageUrl(value?: string) {
  if (!value) return undefined;
  const id = value.match(/drive\.google\.com\/file\/d\/([\w-]+)/)?.[1];
  return id ? `https://lh3.googleusercontent.com/d/${id}` : value;
}
