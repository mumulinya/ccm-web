process.env.CCM_REAL_CHAIN_SURFACE = 'group'
process.env.CCM_REAL_CHAIN_EXERCISE_RESILIENCE = '1'

await import('./main-agent-real-chain-e2e.mjs')
