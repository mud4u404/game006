import './styles/app.css';
import { buildShell, previewBar } from './ui/shell';
import './ui/explore';
import './ui/fight';
import './ui/savecard';
import './ui/wushi';
import { showTitle } from './ui/story';
import { reconcile } from './ui/account';
import { startAutoSync } from './net/sync';

// 试玩预览（/preview/）：顶上一行提示；存档换一套键、不连云存档，见 core/preview.ts
previewBar();
buildShell();
startAutoSync();
showTitle(true);
void reconcile();
