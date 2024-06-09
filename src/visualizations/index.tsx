export type Visual = {
  name: string;
  slug: string;
  path: string;
}
export const visuals = [
  {
    name: 'Ferro Fluid',
    slug: 'ferrofluid',
    path: 'ferrofluid'
  },
  {
    name: 'Ferro Fluid1',
    slug: 'ferrofluid1',
    path: 'ferrofluid1'
  },
  {
    name: 'Bars Circle',
    slug: 'barscircle',
    path: 'barscircle'
  },
  {
    name: 'Bars',
    slug: 'bars',
    path: 'bars'
  }
] as const
