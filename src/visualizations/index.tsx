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
    name: 'Bars Circle',
    slug: 'barscircle',
    path: './visualizations/barscircle'
  },
  {
    name: 'Bars',
    slug: 'bars',
    path: './visualizations/bars'
  }
] as const
