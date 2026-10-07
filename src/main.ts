import './styles/app.css';
import { buildShell } from './ui/shell';
import './ui/explore';
import './ui/fight';
import './ui/savecard';
import { showTitle } from './ui/story';
import { reconcile } from './ui/account';
import { startAutoSync } from './net/sync';

buildShell();
startAutoSync();
showTitle(true);
void reconcile();
