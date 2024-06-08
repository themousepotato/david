export type Visual = {
  name: string;
  slug: string;
  path: string;
}
export const visuals = [
  {
    name: 'Ferro Fluid',
    slug: 'ferrofluid',
    path: './visualizations/ferrofluid'
  },
  {
    name: 'Bars',
    slug: 'bars',
    path: './visualizations/bars'
  }
] as const
