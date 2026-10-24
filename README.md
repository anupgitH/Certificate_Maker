# Certify Studio — Certificate Maker

A responsive React + Vite certificate maker with:
- Four certificate themes
- Live A4 landscape preview
- Drag-to-position text fields
- Text size, color, bold, font, accent/background controls
- Logo and signature image upload
- Unique certificate IDs and QR codes
- PDF and PNG export
- CSV/XLS/XLSX bulk import and ZIP of generated PDFs
- Local browser demo verification

## Requirements
- Node.js 18+ (Node 20 LTS recommended)
- npm

## Run locally
```bash
cd certificate-maker
npm install
npm run dev
```
Open the URL printed by Vite, usually http://localhost:5173.

## Production build
```bash
npm run build
npm run preview
```

## Bulk upload columns
Use a CSV or Excel file with a header row. Recognized columns:
- `name` (required; also accepts `recipient`, `recipient name`, or `student`)
- `course` (optional)
- `organization` or `issuer` (optional)
- `date` (optional)
- `certificate id` or `id` (optional)

A sample CSV can be downloaded from the Bulk generation tab.

## Important verification limitation
This is a front-end demo. Certificate records are stored in the current browser's `localStorage`; they are not shared across devices or users and can be edited by the browser owner. The QR code carries certificate data and a URL, but a URL query does not establish authenticity by itself.

For production verification, add a backend such as Spring Boot and a database:
1. `POST /api/certificates` — issue and persist a certificate record.
2. `GET /api/certificates/{id}` — return the authoritative record for verification.
3. Generate QR codes pointing to the public verification route, e.g. `https://your-domain.com/verify/CERT-...`.
4. Validate all inputs server-side and protect issuer/admin endpoints with authentication.
5. For bulk issuance, use a server-side job/queue for very large files.

## Notes
- Bulk export renders each certificate and writes PDFs into a ZIP; keep the browser tab open while it runs.
- Use transparent PNG files for logos/signatures when possible.
- The certificate preview editor is client-side. Bulk PDFs use the selected theme and colors, but are a simplified bulk layout rather than an exact capture of every custom-positioned text element.
