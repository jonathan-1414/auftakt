export type ExportFormat = 'auftakt' | 'pdf';

/** A module decides which features the app shows and which inputs the model accepts. */
export interface ModuleConfig {
  id: string;
  name: string;
  maxStaves: number;
  measures: number;
  timeSignatures: string[]; // e.g. '4/4'
  keySignatures: number[]; // number of sharps (+) or flats (-)
  durations: number[]; // allowed note values in ticks
  dotted: boolean;
  ties: boolean;
  manualRests: boolean;
  accidentals: Array<-1 | 1>;
  range: { low: string; high: string }; // e.g. 'C4'
  tempoFixed: number | null; // null = tempo can be changed
  exportFormats: ExportFormat[];
}
