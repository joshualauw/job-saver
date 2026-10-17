// Vite's `?url` suffix resolves to the URL of the bundled asset.
declare module "*?url" {
  const url: string;
  export default url;
}
