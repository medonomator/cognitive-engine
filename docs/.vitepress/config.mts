import { defineConfig } from 'vitepress'

export default defineConfig({
  title: 'cognitive-engine',
  description: 'Pure TypeScript library for building AI agents with cognitive capabilities',
  base: '/cognitive-engine/',
  themeConfig: {
    nav: [
      { text: 'Guide', link: '/guide/getting-started' },
      { text: 'Packages', link: '/packages/core' },
      { text: 'API', link: '/api/' },
      { text: 'GitHub', link: 'https://github.com/medonomator/cognitive-engine' }
    ],
    sidebar: {
      '/guide/': [
        {
          text: 'Introduction',
          items: [
            { text: 'What is cognitive-engine?', link: '/guide/what-is-cognitive-engine' },
            { text: 'Getting Started', link: '/guide/getting-started' },
            { text: 'Architecture', link: '/guide/architecture' },
          ]
        },
        {
          text: 'Core Concepts',
          items: [
            { text: 'Cognitive Pipeline', link: '/guide/cognitive-pipeline' },
            { text: 'Perception', link: '/guide/perception' },
            { text: 'Memory', link: '/guide/memory' },
            { text: 'Reasoning', link: '/guide/reasoning' },
            { text: 'Metacognition', link: '/guide/metacognition' },
          ]
        }
      ],
      '/packages/': [
        {
          text: 'Packages',
          items: [
            { text: '@cognitive-engine/core', link: '/packages/core' },
            { text: '@cognitive-engine/perception', link: '/packages/perception' },
            { text: '@cognitive-engine/memory', link: '/packages/memory' },
            { text: '@cognitive-engine/reasoning', link: '/packages/reasoning' },
            { text: '@cognitive-engine/mind', link: '/packages/mind' },
            { text: '@cognitive-engine/emotional', link: '/packages/emotional' },
            { text: '@cognitive-engine/social', link: '/packages/social' },
            { text: '@cognitive-engine/temporal', link: '/packages/temporal' },
            { text: '@cognitive-engine/planning', link: '/packages/planning' },
            { text: '@cognitive-engine/metacognition', link: '/packages/metacognition' },
            { text: '@cognitive-engine/orchestrator', link: '/packages/orchestrator' },
            { text: '@cognitive-engine/math', link: '/packages/math' },
            { text: '@cognitive-engine/bandit', link: '/packages/bandit' },
            { text: '@cognitive-engine/store-memory', link: '/packages/store-memory' },
            { text: '@cognitive-engine/provider-openai', link: '/packages/provider-openai' },
          ]
        }
      ]
    },
    socialLinks: [
      { icon: 'github', link: 'https://github.com/medonomator/cognitive-engine' }
    ],
    search: {
      provider: 'local'
    },
    footer: {
      message: 'Released under the Apache 2.0 License.',
      copyright: 'Copyright 2026 Dmitry Zorin'
    }
  }
})
