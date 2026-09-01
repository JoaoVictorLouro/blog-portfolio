#!/usr/bin/env -S deno run -A

const scriptPath = new URL('./build-material-symbols-subset.sh', import.meta.url).pathname;
const command = new Deno.Command('bash', {
  args: [scriptPath],
  stdout: 'inherit',
  stderr: 'inherit',
});
const { code } = await command.output();
if (code !== 0) {
  Deno.exit(code);
}
