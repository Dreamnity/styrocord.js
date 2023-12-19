import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';

// https://astro.build/config
export default defineConfig({
	site: 'https://dreamnity.in/styrocord.js',
	integrations: [
		starlight({
			title: 'Styrocord.js',
			social: {
				github: 'https://github.com/dreamnity/styrocord.js',
				discord: 'https://discord.dreamnity.in'
			},
			/*sidebar: [
				{
					label: 'Guides',
					items: [
						// Each item here is one entry in the navigation menu.
						{ label: 'Example Guide', link: '/guides/example/' },
					],
				},
				{
					label: 'Reference',
					autogenerate: { directory: 'reference' },
				},
			],*/
			logo: {
				src: './src/assets/3409147304.png',
			},
			editLink: {
				baseUrl: 'https://github.com/dreamnity/styrocord.js/edit/main/doc/',
			},
		}),
	],
});
