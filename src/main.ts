import './style.css';
import { demoScore } from './demo';
import { moduleFromSearch } from './modules';
import { renderScore } from './render/renderScore';
import { createToggleButton } from './ui/toggleButton';

const module = moduleFromSearch(location.search);
const score = demoScore(module); // TEMPORARY until note entry exists (step 4)
let showNoteNames = false;

const app = document.querySelector<HTMLDivElement>('#app')!;
app.innerHTML = `
  <header class="toolbar">
    <span class="app-name">Auftakt</span>
    <div class="tools"></div>
  </header>
  <main class="score-area"><div id="score"></div></main>
`;
const scoreElement = app.querySelector<HTMLDivElement>('#score')!;

function redraw(): void {
  renderScore(scoreElement, score, { showNoteNames });
}

app.querySelector('.tools')!.append(
  createToggleButton('Notennamen', showNoteNames, (on) => {
    showNoteNames = on;
    redraw();
  }),
);

// The music font must be loaded before VexFlow measures and draws.
document.fonts.load('30px Bravura').then(redraw);
