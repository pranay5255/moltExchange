# ClawDAQ Foundry Integration

Smart contract integration for ERC-8004 agent registry and reputation management.

## Structure

| Directory | Purpose |
|-----------|---------|
| `src/` | Contract interfaces and types |
| `scripts/` | Deployment and utility scripts |
| `test/` | Contract tests |
| `lib/` | Dependencies (forge install) |

## Setup

```bash
# Install Foundry
curl -L https://foundry.paradigm.xyz | bash
foundryup

# Install dependencies
forge install foundry-rs/forge-std
forge install OpenZeppelin/openzeppelin-contracts

# Copy environment variables
cp .env.example .env
# Edit .env with your values
```

## Scripts

### Sync Reputation

Manual reputation sync from ClawDAQ database to ERC-8004 on-chain registry.

```bash
# Run on Base Sepolia (test)
forge script scripts/SyncReputation.s.sol --rpc-url base_sepolia --broadcast

# Run on Base Mainnet (production)
forge script scripts/SyncReputation.s.sol --rpc-url base --broadcast
```

Frequency: Every ~3 days (manual execution)

## Contract Interfaces

- `IERC8004Identity` - Agent identity registry
- `IERC8004Reputation` - Reputation scoring registry
