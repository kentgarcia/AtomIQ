import { existsSync, readdirSync } from 'node:fs';
import { Config } from '@remotion/cli/config';

const sandboxBrowser = (): string | null => {
  const root = '/opt/pw-browsers';
  if (!existsSync(root)) return null;
  const found = readdirSync(root)
    .filter((d) => d.startsWith('chromium_headless_shell-'))
    .sort((a, b) => Number(b.split('-')[1]) - Number(a.split('-')[1]))
    .map((d) => `${root}/${d}/chrome-linux/headless_shell`)
    .find((p) => existsSync(p));
  return found ?? null;
};

const browser = process.env.REMOTION_BROWSER || process.env.CHROMIUM_PATH || sandboxBrowser();
if (browser) Config.setBrowserExecutable(browser);

Config.setRspack(process.env.CINETIC_WEBPACK !== '1');
Config.setChromiumOpenGlRenderer('angle');
Config.setVideoImageFormat('png');
Config.setColorSpace('bt709');
Config.setDelayRenderTimeoutInMilliseconds(120000);
Config.setOverwriteOutput(true);
