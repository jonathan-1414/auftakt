import './style.css';
import { moduleFromSearch } from './modules';
import { startApp } from './ui/app';

const module = moduleFromSearch(location.search);
const root = document.querySelector<HTMLDivElement>('#app')!;

// The music font must be loaded before VexFlow measures and draws.
document.fonts.load('30px Bravura').then(() => startApp(root, module));
