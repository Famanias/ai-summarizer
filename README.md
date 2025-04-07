# sv

Everything you need to build a Svelte project, powered by [`sv`](https://github.com/sveltejs/cli).

## Creating a project

If you're seeing this, you've probably already done this step. Congrats!

create an "uploads" folder in the root directory of the project

```bash
# create a new project in the current directory
bunx sv create

# create a new project in my-app
bunx sv create my-app
```

## Developing

Once you've created a project and installed dependencies with `npm install` (or `bun install` in this project), start a development server:

```bash
bun run dev

# or start the server and open the app in a new browser tab
bun run dev -- --open
```

## Building

To create a production version of your app:

```bash
bun run build
```

You can preview the production build with `npm run preview`.

> To deploy your app, you may need to install an [adapter](https://svelte.dev/docs/kit/adapters) for your target environment.
