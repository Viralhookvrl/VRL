import { ROOT } from './config.ts';
import { renderReadme } from './readme.ts';

try {
  console.log(renderReadme(ROOT) ? 'Updated README live state.' : 'README already matches live state.');
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}
