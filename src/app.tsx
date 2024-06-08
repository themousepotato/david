import { For, type Component, lazy } from 'solid-js';
import { Router } from '@solidjs/router';
import { visuals } from './visualizations';

const links = [
  {
    name: 'Home',
    href: '/',
  },
  {
    name: 'About',
    href: '/about',
  },
]


const routes = [
  {
    path: '/about',
    component: lazy(() => import('./pages/about')),
    children: [],
  },
  {
    path: '/',
    component: lazy(() => import('./pages/visual')),
    children: visuals.map((v) => ({
      path: v.slug,
      component: lazy(() => import(`./visualizations/${v.path}.tsx`)),
      children: []
    }))
  },
]

const App: Component = () => {
  return (
    <Router root={(props) => (
      <>
        <nav>
          <ul class="flex">
            <For each={links}>
              {({ name, href }) => (
                <li>
                  <a href={href}>
                    {name}
                  </a>
                </li>
              )}
            </For>
          </ul>
          <ul>
            <For each={visuals}>
              {(v) => (
                <li>
                  <a href={'/' + v.slug}>
                    {v.name}
                  </a>
                </li>
              )}
            </For>
          </ul>
        </nav>
        <main>
          {props.children}
        </main>
      </>
    )
    }>
      {routes}
    </Router>
  );
};

export default App;
