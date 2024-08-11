import { createEffect, Suspense } from 'solid-js';
// import { useRouteData } from '@solidjs/router';
import type { AboutDataType } from './about.data';

export default function About() {
  // const name = useRouteData<AboutDataType>();

  createEffect(() => {
    // console.log(name());
  });

  return (
    <section style="display: flex; flex-direction: column; align-items: center; min-height: 100vh;">
      <h2>About</h2>

      <p>
        DAVID (Digital Audio VIsualizer David) is our attempt to make a digital
        version of DAKD JUNG's <a href="https://burnslap.me/" target="_blank">BurnSlap</a>.
        </p>

        <h2>Maintainers</h2>
        <p>
          <a href="https://github.com/themousepotato/" target="_blank"> @themousepotato</a>&nbsp;
          <a href="https://github.com/xypnox/" target="_blank"> @xypnox</a>
        </p>
        
        <h2>References</h2>
          <ul>
            <li>Some youtube videos&nbsp;
              <a href="https://www.youtube.com/shorts/mQKSkXhBfEU" target="_blank">[1]</a>&nbsp;
            <a href="https://www.youtube.com/watch?app=desktop&v=FtUhvCMQFNw&embeds_referring_euri=https%3A%2F%2Fwww.pedelecs.co.uk%2F&feature=emb_imp_woyt" target="_blank">[2]</a>&nbsp;
            <a href="https://www.youtube.com/watch?v=mCO4syY0_u8" target="_blank">[3]</a>
            </li>
            <li>A reddit thread on&nbsp;
              <a href="https://www.reddit.com/r/arduino/comments/vw6zy2/build_log_ferrofluid_music_visualizer/" target="_blank">r/arduino</a>
            </li>
            <li>
              A hackernews <a href="https://news.ycombinator.com/item?id=38250913" target="_blank">thread</a>
            </li>
            <li>
              A <a href="http://www.hellorhei.com/" target="_blank">prototype</a> of an electro-mechanical clock
            </li>
          </ul>

        <Suspense fallback={<span>...</span>}>
          {/* <span>&nbsp;{name()}</span> */}
        </Suspense>
    </section>
  );
}
