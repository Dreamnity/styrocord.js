import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import starlightDocSearch from '@astrojs/starlight-docsearch';

import react from "@astrojs/react";

// https://astro.build/config
export default defineConfig({
  site: 'https://dreamnity.in/styrocord.js',
  integrations: [starlight({
    title: 'Styrocord.js',
    social: {
      github: 'https://github.com/dreamnity/styrocord.js',
      discord: 'https://discord.dreamnity.in'
    },
    pagefind: true,
    description: 'Lightweight Discord API wrapper(50Kb!)',
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
      src: './src/assets/3409147304.png'
    },
    editLink: {
      baseUrl: 'https://github.com/dreamnity/styrocord.js/edit/main/doc/'
    },
    plugins: [starlightDocSearch({
      appId: 'HASSPHII5K',
      apiKey: 'edd3696c0cf83388a115eb621804b39c',
      indexName: 'dreamnity'
    })]
  }), react()]
});