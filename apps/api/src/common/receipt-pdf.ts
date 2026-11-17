/**
 * Générateur PDF minimaliste (sans dépendance) pour le reçu de paiement.
 * Une page A4, deux polices standard, texte WinAnsi : suffisant pour un reçu
 * lisible et imprimable, et facile à archiver côté usager.
 */

type Line = { text: string; size: number; bold?: boolean; gap?: number }
type Box = { y: number; height: number; fill: [number, number, number] }

export type ReceiptInput = {
  reference: string
  serviceName: string
  amount: number
  receipt: string
  transactionRef: string
  provider: string
  phone: string
  paidAt: Date
  customerName: string
  npi: string
  pickupLocation: string
}

const PAGE_WIDTH = 595
const PAGE_HEIGHT = 842
const MARGIN = 56

function escapeText(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)")
    .replace(/[\r\n]+/g, " ")
    // WinAnsi n'aime pas les caractères exotiques : on reste sur du latin-1.
    .replace(/[^\x20-\xFF]/g, "?")
}

function money(amount: number): string {
  return `${new Intl.NumberFormat("fr-FR").format(amount)} FCFA`
}

function dateLabel(date: Date): string {
  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "long",
    timeStyle: "short",
  }).format(date)
}

function textOp(line: Line, y: number): string {
  const font = line.bold ? "/F2" : "/F1"
  return `BT ${font} ${line.size} Tf 1 0 0 1 ${MARGIN} ${y} Tm (${escapeText(line.text)}) Tj ET`
}

function boxOp(box: Box): string {
  const [r, g, b] = box.fill
  return `${r} ${g} ${b} rg ${MARGIN} ${box.y} ${PAGE_WIDTH - MARGIN * 2} ${box.height} re f 0 0 0 rg`
}

export function buildReceiptPdf(input: ReceiptInput): Buffer {
  const lines: string[] = []
  const boxes: Box[] = []

  let y = PAGE_HEIGHT - MARGIN

  // En-tête vert MindBenin.
  boxes.push({ y: y - 34, height: 52, fill: [0.05, 0.36, 0.24] })
  lines.push(`BT /F2 20 Tf 1 1 1 rg ${MARGIN + 16} ${y} Tm (MindBenin) Tj ET 0 0 0 rg`)
  lines.push(
    `BT /F1 9 Tf 1 1 1 rg ${MARGIN + 16} ${y - 16} Tm (Think & Go - demarches administratives au Benin) Tj ET 0 0 0 rg`,
  )

  y -= 84

  lines.push(`BT /F2 16 Tf ${MARGIN} ${y} Tm (Recu de paiement) Tj ET`)
  y -= 16
  lines.push(`BT /F1 9 Tf ${MARGIN} ${y} Tm (Recu ${escapeText(input.receipt)}) Tj ET`)

  y -= 34
  boxes.push({ y: y - 44, height: 62, fill: [0.94, 0.96, 0.95] })
  lines.push(`BT /F1 9 Tf ${MARGIN + 14} ${y} Tm (Montant paye) Tj ET`)
  lines.push(`BT /F2 24 Tf ${MARGIN + 14} ${y - 26} Tm (${money(input.amount)}) Tj ET`)
  lines.push(
    `BT /F1 9 Tf ${PAGE_WIDTH - MARGIN - 190} ${y} Tm (Statut : PAYE) Tj ET`,
  )

  y -= 78

  const rows: [string, string][] = [
    ["Dossier", input.reference],
    ["Demarche", input.serviceName],
    ["Titulaire", input.customerName],
    ["NPI", input.npi],
    ["Operateur", input.provider],
    ["Numero debite", input.phone],
    ["Reference transaction", input.transactionRef],
    ["Date du paiement", dateLabel(input.paidAt)],
    ["Lieu de retrait", input.pickupLocation],
  ]

  for (const [label, value] of rows) {
    lines.push(`BT /F1 9 Tf 0.4 0.45 0.43 rg ${MARGIN} ${y} Tm (${escapeText(label)}) Tj ET 0 0 0 rg`)
    lines.push(
      `BT /F2 10 Tf ${MARGIN + 170} ${y} Tm (${escapeText(value)}) Tj ET`,
    )
    y -= 10
    lines.push(
      `0.88 0.9 0.89 RG 0.6 w ${MARGIN} ${y} m ${PAGE_WIDTH - MARGIN} ${y} l S 0 0 0 RG`,
    )
    y -= 14
  }

  y -= 18
  lines.push(
    `BT /F1 8 Tf 0.4 0.45 0.43 rg ${MARGIN} ${y} Tm (Ce recu atteste du paiement des frais officiels et des frais de service MindBenin.) Tj ET`,
  )
  y -= 11
  lines.push(
    `BT /F1 8 Tf 0.4 0.45 0.43 rg ${MARGIN} ${y} Tm (Verifie son authenticite avec sa reference et le numero de recu ci-dessus.) Tj ET`,
  )
  y -= 26
  lines.push(
    `BT /F2 9 Tf ${MARGIN} ${y} Tm (Document genere automatiquement - aucune signature manuscrite requise.) Tj ET`,
  )

  const content = [...boxes.map(boxOp), ...lines].join("\n")

  const objects: string[] = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_WIDTH} ${PAGE_HEIGHT}] /Resources << /Font << /F1 4 0 R /F2 5 0 R >> >> /Contents 6 0 R >>`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>",
    `<< /Length ${Buffer.byteLength(content, "latin1")} >>\nstream\n${content}\nendstream`,
  ]

  const parts: Buffer[] = []
  const offsets: number[] = []
  let cursor = 0

  const push = (chunk: string) => {
    const buffer = Buffer.from(chunk, "latin1")
    parts.push(buffer)
    cursor += buffer.length
  }

  push("%PDF-1.4\n")

  objects.forEach((object, index) => {
    offsets.push(cursor)
    push(`${index + 1} 0 obj\n${object}\nendobj\n`)
  })

  const xrefOffset = cursor
  const xref = [
    "xref",
    `0 ${objects.length + 1}`,
    "0000000000 65535 f ",
    ...offsets.map((offset) => `${String(offset).padStart(10, "0")} 00000 n `),
    "trailer",
    `<< /Size ${objects.length + 1} /Root 1 0 R >>`,
    "startxref",
    String(xrefOffset),
    "%%EOF",
    "",
  ].join("\n")

  push(xref)

  return Buffer.concat(parts)
}
