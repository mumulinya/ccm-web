process.env.CCM_REAL_CHAIN_SURFACE = 'global'
process.env.CCM_REAL_CHAIN_INJECT_TEST_FAILURE = '1'

await import('./main-agent-real-chain-e2e.mjs')
