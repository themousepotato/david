import { For, type Component, lazy } from 'solid-js';
import { Router } from '@solidjs/router';

const links = [
  {
    name: 'Home',
    href: '/david/',
  },
  {
    name: 'About',
    href: '/david/about',
  },
]


const routes = [
  {
    path: '/david/about',
    component: lazy(() => import('./pages/about')),
    children: [],
  },
  {
    path: '/david/',
    component: lazy(() => import('./visualizations/ferrofluid')),
    children: [],
    allowImportingTsExtensions: true,
  }
]

const App: Component = () => {
  return (
    <Router root={(props) => (
      <>
      <header class="header">
        <div class="logo">DAVID</div>
        <nav class="menu">
          <For each={links}>
            {({ name, href }) => (
              <a href={href} class="link">
                {name}
              </a>
            )}
          </For>
        </nav>
      </header>
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
