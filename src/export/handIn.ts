import { strToU8, zipSync } from 'fflate';
import type { Score } from '../model/types';
import { renderScoreToCanvas } from '../render/renderScore';
import { baseFileName } from './filename';

/**
 * Builds the files for handing in: the Auftakt file, the PDF, or both in one ZIP file.
 * The file name follows [klasse]_[name(n)]_[jjjj-mm-tt].
 */
export type Format = 'auftakt' | 'pdf';

export async function buildHandIn(score: Score, formats: Format[], date: Date): Promise<File> {
  const base = baseFileName(score.meta, date);
  const parts: Array<{ name: string; type: string; bytes: Uint8Array }> = [];
  if (formats.includes('auftakt')) {
    parts.push({ name: `${base}.auftakt`, type: 'application/json', bytes: auftaktBytes(score) });
  }
  if (formats.includes('pdf')) {
    parts.push({ name: `${base}.pdf`, type: 'application/pdf', bytes: await pdfBytes(score, date) });
  }
  if (parts.length === 0) throw new Error('No format chosen');
  if (parts.length === 1) return new File([parts[0].bytes as BlobPart], parts[0].name, { type: parts[0].type });
  const zip = zipSync(Object.fromEntries(parts.map((p) => [p.name, p.bytes])));
  return new File([zip as BlobPart], `${base}.zip`, { type: 'application/zip' });
}

/** The Auftakt file: the score as readable JSON (with format and version). */
export function auftaktBytes(score: Score): Uint8Array {
  return strToU8(JSON.stringify(score, null, 2));
}

/** Date as the PDF shows it, e.g. 13.11.2026. */
export function germanDate(date: Date): string {
  return date.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

/** A4 landscape: title, name(s), class and date at the top, the music below. */
async function pdfBytes(score: Score, date: Date): Promise<Uint8Array> {
  const { jsPDF } = await import('jspdf'); // loaded only when needed
  const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const margin = 15;
  const width = pdf.internal.pageSize.getWidth() - 2 * margin;
  let y = margin + 4;

  const { title, names, className } = score.meta;
  pdf.setFont('helvetica', 'bold');
  if (title) {
    pdf.setFontSize(18);
    pdf.text(title, margin, y);
    y += 9;
  }
  pdf.setFontSize(11);
  const lines: Array<[string, string]> = [
    [names.length > 1 ? 'Namen:' : 'Name:', names.join(', ')],
    ['Klasse:', className],
    ['Datum:', germanDate(date)],
  ];
  for (const [label, value] of lines) {
    pdf.setFont('helvetica', 'bold');
    pdf.text(label, margin, y);
    pdf.setFont('helvetica', 'normal');
    pdf.text(value, margin + 18, y);
    y += 6;
  }

  // The music as a high-resolution picture (about 300 dpi when printed).
  const canvas = renderScoreToCanvas(score, 4.5);
  const height = (width * canvas.height) / canvas.width;
  // 'FAST' compresses the picture (black notes on white: small), otherwise the PDF gets very large.
  pdf.addImage(canvas.toDataURL('image/png'), 'PNG', margin, y + 6, width, height, undefined, 'FAST');
  return new Uint8Array(pdf.output('arraybuffer'));
}
