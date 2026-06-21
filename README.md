# CCM Development Workspace

CCM separates editable source code from the npm publication payload:

```text
backend/       TypeScript backend source
frontend/      Vue frontend source
integrations/  Bundled integration source, including the Feishu MCP server
ccm-package/   npm runtime files and generated build output
```

## Development

```bash
npm install
npm --prefix frontend install
npm run check
npm run build
```

`npm run build` writes backend output to `ccm-package/dist`, frontend output to
`ccm-package/public`, and integration output into the corresponding package
directories. Run `npm run pack` to build and create the npm tarball.

Do not edit generated files in `ccm-package` directly.
