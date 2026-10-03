export interface TrackedModel {
  brand: string;
  brandAutoriaId: number;
  model: string;
  modelAutoriaId: number;
}

export const trackedModels: TrackedModel[] = [
  { brand: 'Toyota', brandAutoriaId: 79, model: 'RAV4', modelAutoriaId: 715 },
];
